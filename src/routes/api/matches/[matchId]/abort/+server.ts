import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { matches, scores } from '$lib/server/db/schema.js';
import { emitAll } from '$lib/server/sse.js';
import { toMatchState } from '$lib/server/match-state.js';
import { eq, desc } from 'drizzle-orm';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ params }) => {
	const matchId = parseInt(params.matchId);

	const match = await db.query.matches.findFirst({
		where: eq(matches.id, matchId)
	});
	if (!match) return json({ error: 'Match not found' }, { status: 404 });
	if (match.status !== 'live') return json({ error: 'Match is not live' }, { status: 400 });

	const [updated] = await db
		.update(matches)
		.set({ status: 'upcoming', updatedAt: new Date() })
		.where(eq(matches.id, matchId))
		.returning();

	const score = await db.query.scores.findFirst({
		where: eq(scores.matchId, matchId),
		orderBy: desc(scores.id)
	});

	if (score) {
		const state = toMatchState(updated, score);
		emitAll(matchId, { type: 'match', data: state });
	}

	return json({ ok: true });
};
