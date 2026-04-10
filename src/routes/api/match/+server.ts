import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { matches, scores } from '$lib/server/db/schema.js';
import { emitAll } from '$lib/server/sse.js';
import { toMatchState } from '$lib/server/match-state.js';
import { addPoint, removePoint, resetMatch, isMatchOver } from '$lib/volleyball.js';
import { matchCreateSchema, matchActionSchema, matchSettingsSchema } from '$lib/server/validation.js';
import { and, eq, desc } from 'drizzle-orm';
import type { MatchState } from '$lib/types.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ url, locals }) => {
	const { orgId } = locals;
	const matchId = url.searchParams.get('id');

	if (matchId) {
		const id = parseInt(matchId);
		if (isNaN(id)) return json({ error: 'Invalid match id' }, { status: 400 });

		const match = await db.query.matches.findFirst({
			where: and(eq(matches.orgId, orgId), eq(matches.id, id))
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
		where: eq(matches.orgId, orgId),
		orderBy: desc(matches.createdAt)
	});
	return json(allMatches);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const { orgId } = locals;
	const raw = await request.json();
	const parsed = matchCreateSchema.safeParse(raw);
	if (!parsed.success) return json({ error: 'Invalid input' }, { status: 400 });
	const body = parsed.data;

	const [match] = await db
		.insert(matches)
		.values({
			orgId,
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
	emitAll(match.id, { type: 'match', data: state });

	return json(state, { status: 201 });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	const { orgId } = locals;
	const raw = await request.json();

	if (raw.action) {
		const parsed = matchActionSchema.safeParse(raw);
		if (!parsed.success) return json({ error: 'Invalid input' }, { status: 400 });
		const body = parsed.data;
		const matchId = body.matchId;

		// Score actions
		const currentScore = await db.query.scores.findFirst({
			where: eq(scores.matchId, matchId),
			orderBy: desc(scores.createdAt)
		});
		if (!currentScore) return json({ error: 'Score not found' }, { status: 404 });

		const match = await db.query.matches.findFirst({
			where: and(eq(matches.orgId, orgId), eq(matches.id, matchId))
		});
		if (!match) return json({ error: 'Match not found' }, { status: 404 });

		const state = toMatchState(match, currentScore);

		let newState: MatchState;
		switch (body.action) {
			case 'addPoint':
				newState = addPoint(state, body.team!);
				break;
			case 'removePoint':
				newState = removePoint(state, body.team!);
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
			case 'undo': {
				// Get all score records for this match
				const allScores = await db.query.scores.findMany({
					where: eq(scores.matchId, matchId),
					orderBy: desc(scores.createdAt)
				});
				if (allScores.length <= 1) {
					return json({ error: 'Nothing to undo' }, { status: 400 });
				}
				// Delete the latest record
				await db.delete(scores).where(eq(scores.id, allScores[0].id));
				// Reconstruct state from previous record
				const previousScore = allScores[1];
				const undoState = toMatchState(match, previousScore);
				// Update match status if needed (e.g. finished -> live)
				const correctStatus = isMatchOver(undoState.homeSets, undoState.guestSets) ? 'finished' : 'live';
				if (correctStatus !== match.status) {
					await db.update(matches).set({ status: correctStatus, updatedAt: new Date() }).where(eq(matches.id, matchId));
					undoState.status = correctStatus;
				}
				emitAll(matchId, { type: 'score', data: undoState });
				return json(undoState);
			}
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

		emitAll(matchId, { type: 'score', data: newState });
		return json(newState);
	}

	// Update match settings (team names, colors)
	const settingsParsed = matchSettingsSchema.safeParse(raw);
	if (!settingsParsed.success) return json({ error: 'Invalid input' }, { status: 400 });
	const body = settingsParsed.data;
	const matchId = body.matchId;

	const settingsFields = ['homeTeamName', 'guestTeamName', 'homeJerseyColor', 'guestJerseyColor', 'showJerseyColors', 'showSetScores'] as const;
	const updateData: Record<string, unknown> = { updatedAt: new Date() };
	for (const field of settingsFields) {
		if (body[field] !== undefined) updateData[field] = body[field];
	}

	await db.update(matches).set(updateData).where(and(eq(matches.orgId, orgId), eq(matches.id, matchId)));

	const match = await db.query.matches.findFirst({ where: and(eq(matches.orgId, orgId), eq(matches.id, matchId)) });
	const score = await db.query.scores.findFirst({
		where: eq(scores.matchId, matchId),
		orderBy: desc(scores.createdAt)
	});

	if (!match || !score) return json({ error: 'Not found' }, { status: 404 });

	const state = toMatchState(match, score);
	emitAll(matchId, { type: 'match', data: state });
	return json(state);
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
	const { orgId } = locals;
	const matchId = url.searchParams.get('id');
	if (!matchId) return json({ error: 'Missing id' }, { status: 400 });
	const id = parseInt(matchId);
	if (isNaN(id)) return json({ error: 'Invalid match id' }, { status: 400 });

	await db.delete(matches).where(and(eq(matches.orgId, orgId), eq(matches.id, id)));
	return json({ ok: true });
};
