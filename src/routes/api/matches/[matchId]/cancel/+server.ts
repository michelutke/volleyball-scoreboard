import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { matches, scores, timeouts } from '$lib/server/db/schema.js';
import { matchSSEEmitter } from '$lib/server/sse.js';
import { eq } from 'drizzle-orm';
import type { MatchState } from '$lib/types.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ params }) => {
	const matchId = parseInt(params.matchId);

	const match = await db.query.matches.findFirst({
		where: eq(matches.id, matchId)
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

	const state: MatchState = {
		matchId: updated.id,
		homeTeamName: updated.homeTeamName,
		guestTeamName: updated.guestTeamName,
		homeJerseyColor: updated.homeJerseyColor,
		guestJerseyColor: updated.guestJerseyColor,
		showJerseyColors: updated.showJerseyColors,
		homePoints: 0,
		guestPoints: 0,
		homeSets: 0,
		guestSets: 0,
		currentSet: 1,
		setScores: [],
		serviceTeam: 'home',
		showSetScores: updated.showSetScores,
		status: 'upcoming'
	};
	matchSSEEmitter.emit(matchId, { type: 'match', data: state });

	return json({ success: true });
};
