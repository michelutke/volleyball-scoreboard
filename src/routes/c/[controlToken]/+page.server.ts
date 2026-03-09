import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { matches, scores, timeouts } from '$lib/server/db/schema.js';
import { toMatchState } from '$lib/server/match-state.js';
import { eq, desc, asc, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params }) => {
	const { controlToken } = params;

	const match = await db.query.matches.findFirst({
		where: eq(matches.controlToken, controlToken)
	});
	if (!match) error(404, 'Link nicht gefunden');

	const score = await db.query.scores.findFirst({
		where: eq(scores.matchId, match.id),
		orderBy: desc(scores.createdAt)
	});
	if (!score) error(404, 'Score nicht gefunden');

	const [homeTimeouts, guestTimeouts, scoreHistory, timeoutHistory] = await Promise.all([
		db.query.timeouts.findMany({
			where: and(eq(timeouts.matchId, match.id), eq(timeouts.team, 'home'), eq(timeouts.set, score.currentSet))
		}),
		db.query.timeouts.findMany({
			where: and(eq(timeouts.matchId, match.id), eq(timeouts.team, 'guest'), eq(timeouts.set, score.currentSet))
		}),
		db.query.scores.findMany({
			where: eq(scores.matchId, match.id),
			orderBy: asc(scores.createdAt)
		}),
		db.query.timeouts.findMany({
			where: eq(timeouts.matchId, match.id),
			orderBy: asc(timeouts.createdAt)
		})
	]);

	return {
		controlToken,
		activeMatch: toMatchState(match, score),
		timeouts: { home: homeTimeouts.length, guest: guestTimeouts.length },
		scoreHistory,
		timeoutHistory
	};
};
