import { db } from '$lib/server/db/index.js';
import { matches, scores, timeouts } from '$lib/server/db/schema.js';
import { toMatchState } from '$lib/server/match-state.js';
import { eq, desc, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async () => {
	const liveMatch = await db.query.matches.findFirst({
		where: eq(matches.status, 'live'),
		orderBy: desc(matches.createdAt)
	});

	if (!liveMatch) return { match: null, timeouts: { home: 0, guest: 0 } };

	const score = await db.query.scores.findFirst({
		where: eq(scores.matchId, liveMatch.id),
		orderBy: desc(scores.createdAt)
	});

	if (!score) return { match: null, timeouts: { home: 0, guest: 0 } };

	const [homeTimeouts, guestTimeouts] = await Promise.all([
		db.query.timeouts.findMany({
			where: and(
				eq(timeouts.matchId, liveMatch.id),
				eq(timeouts.team, 'home'),
				eq(timeouts.set, score.currentSet)
			)
		}),
		db.query.timeouts.findMany({
			where: and(
				eq(timeouts.matchId, liveMatch.id),
				eq(timeouts.team, 'guest'),
				eq(timeouts.set, score.currentSet)
			)
		})
	]);

	return {
		match: toMatchState(liveMatch, score),
		timeouts: { home: homeTimeouts.length, guest: guestTimeouts.length }
	};
};
