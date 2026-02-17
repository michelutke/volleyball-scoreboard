import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { matches, scores } from '$lib/server/db/schema.js';
import { matchSSEEmitter } from '$lib/server/sse.js';
import { toMatchState } from '$lib/server/match-state.js';
import { addPoint, removePoint, resetMatch, isMatchOver } from '$lib/volleyball.js';
import { eq, desc } from 'drizzle-orm';
import type { MatchState } from '$lib/types.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ params }) => {
	const matchId = parseInt(params.matchId);

	const match = await db.query.matches.findFirst({
		where: eq(matches.id, matchId)
	});
	if (!match) return json({ error: 'Match not found' }, { status: 404 });

	const score = await db.query.scores.findFirst({
		where: eq(scores.matchId, matchId),
		orderBy: desc(scores.createdAt)
	});
	if (!score) return json({ error: 'Score not found' }, { status: 404 });

	return json(toMatchState(match, score));
};

export const PUT: RequestHandler = async ({ params, request }) => {
	const matchId = parseInt(params.matchId);
	const body = await request.json();

	if (body.action) {
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
			case 'undo': {
				const allScores = await db.query.scores.findMany({
					where: eq(scores.matchId, matchId),
					orderBy: desc(scores.createdAt)
				});
				if (allScores.length <= 1) {
					return json({ error: 'Nothing to undo' }, { status: 400 });
				}
				await db.delete(scores).where(eq(scores.id, allScores[0].id));
				const previousScore = allScores[1];
				const undoState = toMatchState(match, previousScore);
				const correctStatus = isMatchOver(undoState.homeSets, undoState.guestSets) ? 'finished' : 'live';
				if (correctStatus !== match.status) {
					await db.update(matches).set({ status: correctStatus, updatedAt: new Date() }).where(eq(matches.id, matchId));
					undoState.status = correctStatus;
				}
				matchSSEEmitter.emit(matchId, { type: 'score', data: undoState });
				return json(undoState);
			}
			default:
				return json({ error: 'Unknown action' }, { status: 400 });
		}

		if (newState.status !== match.status) {
			await db.update(matches).set({ status: newState.status, updatedAt: new Date() }).where(eq(matches.id, matchId));
		}

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

		matchSSEEmitter.emit(matchId, { type: 'score', data: newState });
		return json(newState);
	}

	// Settings update
	const settingsFields = ['homeTeamName', 'guestTeamName', 'homeJerseyColor', 'guestJerseyColor', 'showJerseyColors', 'showSetScores'] as const;
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
	matchSSEEmitter.emit(matchId, { type: 'match', data: state });
	return json(state);
};
