import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { settings, matches, scores, timeouts } from '$lib/server/db/schema.js';
import { toMatchState } from '$lib/server/match-state.js';
import { eq, desc, asc, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	const matchId = parseInt(params.matchId);
	const { orgId } = locals;

	const match = await db.query.matches.findFirst({
		where: eq(matches.id, matchId)
	});
	if (!match) error(404, 'Match not found');

	const score = await db.query.scores.findFirst({
		where: eq(scores.matchId, matchId),
		orderBy: desc(scores.createdAt)
	});
	if (!score) error(404, 'Score not found');

	const [homeTimeouts, guestTimeouts, permalinkRow, scoreHistory, timeoutHistory] = await Promise.all([
		db.query.timeouts.findMany({
			where: and(eq(timeouts.matchId, matchId), eq(timeouts.team, 'home'), eq(timeouts.set, score.currentSet))
		}),
		db.query.timeouts.findMany({
			where: and(eq(timeouts.matchId, matchId), eq(timeouts.team, 'guest'), eq(timeouts.set, score.currentSet))
		}),
		db.query.settings.findFirst({
			where: and(eq(settings.orgId, orgId), eq(settings.key, 'permalinkOverlayMatchId'))
		}),
		db.query.scores.findMany({
			where: eq(scores.matchId, matchId),
			orderBy: asc(scores.createdAt)
		}),
		db.query.timeouts.findMany({
			where: eq(timeouts.matchId, matchId),
			orderBy: asc(timeouts.createdAt)
		})
	]);

	const permalinkOverlayMatchId = permalinkRow?.value ? parseInt(permalinkRow.value) : null;

	return {
		activeMatch: toMatchState(match, score),
		timeouts: { home: homeTimeouts.length, guest: guestTimeouts.length },
		scoreHistory,
		timeoutHistory,
		teamId: match.teamId,
		permalinkOverlayMatchId
	};
};
