import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { scores, timeouts } from '$lib/server/db/schema.js';
import { toMatchState } from '$lib/server/match-state.js';
import { eq, desc, asc, and } from 'drizzle-orm';
import { getGuestMatch } from '$lib/server/match-service';
import { loadMatchOverlayDesign } from '$lib/server/overlay-data.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params }) => {
	const { controlToken } = params;

	const match = await getGuestMatch(controlToken);
	if (!match) error(404, 'Link nicht gefunden');
	if (match === 'expired') error(410, 'Spiel beendet');

	const score = await db.query.scores.findFirst({
		where: eq(scores.matchId, match.id),
		orderBy: desc(scores.createdAt)
	});
	if (!score) error(409, 'Spiel hat noch nicht begonnen');

	const [homeTimeouts, guestTimeouts, scoreHistory, timeoutHistory, overlayDesign] = await Promise.all([
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
		}),
		loadMatchOverlayDesign(match)
	]);

	return {
		controlToken,
		activeMatch: toMatchState(match, score),
		timeouts: { home: homeTimeouts.length, guest: guestTimeouts.length },
		scoreHistory,
		timeoutHistory,
		overlayDesign
	};
};
