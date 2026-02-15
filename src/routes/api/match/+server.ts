import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { matches, scores } from '$lib/server/db/schema.js';
import { sseEmitter } from '$lib/server/sse.js';
import { toMatchState } from '$lib/server/match-state.js';
import { addPoint, removePoint, resetMatch } from '$lib/volleyball.js';
import { eq, desc } from 'drizzle-orm';
import type { MatchState } from '$lib/types.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ url }) => {
	const matchId = url.searchParams.get('id');

	if (matchId) {
		const match = await db.query.matches.findFirst({
			where: eq(matches.id, parseInt(matchId))
		});
		if (!match) return json({ error: 'Match not found' }, { status: 404 });

		const score = await db.query.scores.findFirst({
			where: eq(scores.matchId, match.id),
			orderBy: desc(scores.createdAt)
		});
		if (!score) return json({ error: 'Score not found' }, { status: 404 });

		return json(toMatchState(match, score));
	}

	const allMatches = await db.query.matches.findMany({
		orderBy: desc(matches.createdAt)
	});
	return json(allMatches);
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();

	const [match] = await db
		.insert(matches)
		.values({
			homeTeamName: body.homeTeamName ?? 'Heim',
			guestTeamName: body.guestTeamName ?? 'Gast',
			homeJerseyColor: body.homeJerseyColor ?? '#1e40af',
			guestJerseyColor: body.guestJerseyColor ?? '#dc2626',
			showJerseyColors: body.showJerseyColors ?? true,
			status: 'live'
		})
		.returning();

	const [score] = await db
		.insert(scores)
		.values({ matchId: match.id })
		.returning();

	const state = toMatchState(match, score);
	sseEmitter.emit({ type: 'match', data: state });

	return json(state, { status: 201 });
};

export const PUT: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const matchId = body.matchId as number;

	if (body.action) {
		// Score actions
		const currentScore = await db.query.scores.findFirst({
			where: eq(scores.matchId, matchId),
			orderBy: desc(scores.createdAt)
		});
		if (!currentScore) return json({ error: 'Score not found' }, { status: 404 });

		const match = await db.query.matches.findFirst({
			where: eq(matches.id, matchId)
		});
		if (!match) return json({ error: 'Match not found' }, { status: 404 });

		const state = toMatchState(match, currentScore);

		let newState: MatchState;
		switch (body.action) {
			case 'addPoint':
				newState = addPoint(state, body.team);
				break;
			case 'removePoint':
				newState = removePoint(state, body.team);
				break;
			case 'reset':
				newState = resetMatch(state);
				break;
			case 'switchService':
				newState = { ...state, serviceTeam: state.serviceTeam === 'home' ? 'guest' : 'home' };
				break;
			case 'addSet':
				newState = { ...state };
				if (body.team === 'home') newState.homeSets++;
				else newState.guestSets++;
				break;
			case 'removeSet':
				newState = { ...state };
				if (body.team === 'home' && state.homeSets > 0) newState.homeSets--;
				else if (body.team === 'guest' && state.guestSets > 0) newState.guestSets--;
				break;
			default:
				return json({ error: 'Unknown action' }, { status: 400 });
		}

		// Update match status
		if (newState.status !== match.status) {
			await db.update(matches).set({ status: newState.status, updatedAt: new Date() }).where(eq(matches.id, matchId));
		}

		// Insert new score record
		await db.insert(scores).values({
			matchId,
			homePoints: newState.homePoints,
			guestPoints: newState.guestPoints,
			homeSets: newState.homeSets,
			guestSets: newState.guestSets,
			currentSet: newState.currentSet,
			setScores: newState.setScores,
			serviceTeam: newState.serviceTeam
		});

		sseEmitter.emit({ type: 'score', data: newState });
		return json(newState);
	}

	// Update match settings (team names, colors)
	const settingsFields = ['homeTeamName', 'guestTeamName', 'homeJerseyColor', 'guestJerseyColor', 'showJerseyColors'] as const;
	const updateData: Record<string, unknown> = { updatedAt: new Date() };
	for (const field of settingsFields) {
		if (body[field] !== undefined) updateData[field] = body[field];
	}

	await db.update(matches).set(updateData).where(eq(matches.id, matchId));

	const match = await db.query.matches.findFirst({ where: eq(matches.id, matchId) });
	const score = await db.query.scores.findFirst({
		where: eq(scores.matchId, matchId),
		orderBy: desc(scores.createdAt)
	});

	if (!match || !score) return json({ error: 'Not found' }, { status: 404 });

	const state = toMatchState(match, score);
	sseEmitter.emit({ type: 'match', data: state });
	return json(state);
};

export const DELETE: RequestHandler = async ({ url }) => {
	const matchId = url.searchParams.get('id');
	if (!matchId) return json({ error: 'Missing id' }, { status: 400 });

	await db.delete(matches).where(eq(matches.id, parseInt(matchId)));
	return json({ ok: true });
};
