import { db } from '$lib/server/db/index.js';
import { matches, scores, timeouts } from '$lib/server/db/schema.js';
import { toMatchState } from '$lib/server/match-state.js';
import { eq, desc, asc, and } from 'drizzle-orm';
import type { MatchState } from '$lib/types.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async () => {
	const allMatches = await db.query.matches.findMany({
		orderBy: desc(matches.createdAt)
	});

	let activeMatch: MatchState | null = null;
	let matchTimeouts = { home: 0, guest: 0 };

	const liveMatch = allMatches.find((m) => m.status === 'live') ?? allMatches[0];

	if (liveMatch) {
		const score = await db.query.scores.findFirst({
			where: eq(scores.matchId, liveMatch.id),
			orderBy: desc(scores.createdAt)
		});

		if (score) {
			activeMatch = toMatchState(liveMatch, score);

			const homeTimeouts = await db.query.timeouts.findMany({
				where: and(
					eq(timeouts.matchId, liveMatch.id),
					eq(timeouts.team, 'home'),
					eq(timeouts.set, score.currentSet)
				)
			});
			const guestTimeouts = await db.query.timeouts.findMany({
				where: and(
					eq(timeouts.matchId, liveMatch.id),
					eq(timeouts.team, 'guest'),
					eq(timeouts.set, score.currentSet)
				)
			});

			matchTimeouts = {
				home: homeTimeouts.length,
				guest: guestTimeouts.length
			};
		}
	}

	const scoreHistory = liveMatch
		? await db.query.scores.findMany({
				where: eq(scores.matchId, liveMatch.id),
				orderBy: asc(scores.createdAt)
			})
		: [];

	const timeoutHistory = liveMatch
		? await db.query.timeouts.findMany({
				where: eq(timeouts.matchId, liveMatch.id),
				orderBy: asc(timeouts.createdAt)
			})
		: [];

	return {
		matches: allMatches,
		activeMatch,
		timeouts: matchTimeouts,
		scoreHistory,
		timeoutHistory
	};
};
