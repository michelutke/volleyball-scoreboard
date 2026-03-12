import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { matches, scores, timeouts } from '$lib/server/db/schema.js';
import { matchSSEEmitter } from '$lib/server/sse.js';
import { toResetMatchState } from '$lib/server/match-state.js';
import { and, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ params, locals }) => {
	const { orgId } = locals;
	const matchId = parseInt(params.matchId);

	const match = await db.query.matches.findFirst({
		where: and(eq(matches.orgId, orgId), eq(matches.id, matchId))
	});
	if (!match) return json({ error: 'Match not found' }, { status: 404 });
	if (match.status !== 'live') return json({ error: 'Match is not live' }, { status: 400 });

	// Reset status to upcoming
	const [updated] = await db
		.update(matches)
		.set({ status: 'upcoming', updatedAt: new Date() })
		.where(eq(matches.id, matchId))
		.returning();

	// Delete all scores and timeouts
	await db.delete(scores).where(eq(scores.matchId, matchId));
	await db.delete(timeouts).where(eq(timeouts.matchId, matchId));

	matchSSEEmitter.emit(matchId, { type: 'match', data: toResetMatchState(updated) });

	return json({ success: true });
};
