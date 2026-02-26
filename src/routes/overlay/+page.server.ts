import { db } from '$lib/server/db/index.js';
import { settings, matches, scores, timeouts } from '$lib/server/db/schema.js';
import { toMatchState } from '$lib/server/match-state.js';
import { eq, desc, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals }) => {
	const { orgId } = locals;

	const permalinkRow = await db.query.settings.findFirst({
		where: and(eq(settings.orgId, orgId), eq(settings.key, 'permalinkOverlayMatchId'))
	});

	if (!permalinkRow?.value) return { match: null, matchId: null, timeouts: { home: 0, guest: 0 } };

	const matchId = parseInt(permalinkRow.value);

	const match = await db.query.matches.findFirst({
		where: eq(matches.id, matchId)
	});

	if (!match) return { match: null, matchId: null, timeouts: { home: 0, guest: 0 } };

	const score = await db.query.scores.findFirst({
		where: eq(scores.matchId, matchId),
		orderBy: desc(scores.createdAt)
	});

	if (!score) return { match: null, matchId, timeouts: { home: 0, guest: 0 } };

	const [homeTimeouts, guestTimeouts] = await Promise.all([
		db.query.timeouts.findMany({
			where: and(
				eq(timeouts.matchId, matchId),
				eq(timeouts.team, 'home'),
				eq(timeouts.set, score.currentSet)
			)
		}),
		db.query.timeouts.findMany({
			where: and(
				eq(timeouts.matchId, matchId),
				eq(timeouts.team, 'guest'),
				eq(timeouts.set, score.currentSet)
			)
		})
	]);

	return {
		match: toMatchState(match, score),
		matchId,
		timeouts: { home: homeTimeouts.length, guest: guestTimeouts.length }
	};
};
