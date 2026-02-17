import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { matches, scores } from '$lib/server/db/schema.js';
import { matchSSEEmitter } from '$lib/server/sse.js';
import { toMatchState } from '$lib/server/match-state.js';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ params }) => {
	const matchId = parseInt(params.matchId);

	const match = await db.query.matches.findFirst({
		where: eq(matches.id, matchId)
	});
	if (!match) return json({ error: 'Match not found' }, { status: 404 });

	// Set status to live
	const [updated] = await db
		.update(matches)
		.set({ status: 'live', updatedAt: new Date() })
		.where(eq(matches.id, matchId))
		.returning();

	// Create initial score record if none exists
	let score = await db.query.scores.findFirst({
		where: eq(scores.matchId, matchId)
	});

	if (!score) {
		const [newScore] = await db
			.insert(scores)
			.values({ matchId })
			.returning();
		score = newScore;
	}

	const state = toMatchState(updated, score);
	matchSSEEmitter.emit(matchId, { type: 'match', data: state });

	return json(state);
};
