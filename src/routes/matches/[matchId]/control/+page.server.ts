import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { settings, matches, scores, timeouts, designTemplates } from '$lib/server/db/schema.js';
import { toMatchState } from '$lib/server/match-state.js';
import { getUpcomingGames } from '$lib/server/swiss-volley.js';
import { eq, desc, asc, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	const matchId = parseInt(params.matchId);
	const { orgId } = locals;

	let match = await db.query.matches.findFirst({
		where: eq(matches.id, matchId)
	});
	if (!match) error(404, 'Match not found');

	// One-time logo fetch: only if both logos are missing and match has a SV ID
	if (match && !match.homeTeamLogo && !match.guestTeamLogo && match.swissVolleyMatchId) {
		try {
			const games = await getUpcomingGames(locals.orgId);
			const svId = match.swissVolleyMatchId;
			const game = games.find((g) => String(g.gameId) === svId);
			if (game) {
				const homeTeamLogo = game.teams.home.logo ?? null;
				const guestTeamLogo = game.teams.away.logo ?? null;
				if (homeTeamLogo || guestTeamLogo) {
					await db.update(matches).set({ homeTeamLogo, guestTeamLogo }).where(eq(matches.id, matchId));
					match = { ...match, homeTeamLogo, guestTeamLogo };
				}
			}
		} catch {
			// non-fatal — proceed without logos
		}
	}

	const score = await db.query.scores.findFirst({
		where: eq(scores.matchId, matchId),
		orderBy: desc(scores.createdAt)
	});
	if (!score) error(404, 'Score not found');

	const [homeTimeouts, guestTimeouts, permalinkRow, scoreHistory, timeoutHistory, orgDesignTemplates] = await Promise.all([
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
		}),
		db.query.designTemplates.findMany({
			where: eq(designTemplates.orgId, orgId),
			orderBy: designTemplates.createdAt
		})
	]);

	const permalinkOverlayMatchId = permalinkRow?.value ? parseInt(permalinkRow.value) : null;

	const orgSettingsRows = await db.query.settings.findMany({
		where: eq(settings.orgId, orgId)
	});
	const orgDefaultLayout = orgSettingsRows.find((r) => r.key === 'defaultScoreboardLayout')?.value ?? null;

	return {
		activeMatch: toMatchState(match, score),
		timeouts: { home: homeTimeouts.length, guest: guestTimeouts.length },
		scoreHistory,
		timeoutHistory,
		teamId: match.teamId,
		permalinkOverlayMatchId,
		controlToken: match.controlToken ?? null,
		designTemplates: orgDesignTemplates,
		scoreboardLayout: match.scoreboardLayout ?? null,
		scoreboardOptions: (match.scoreboardOptions as Record<string, string | number | boolean> | null) ?? null,
		orgDefaultLayout
	};
};
