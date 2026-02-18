import { db } from '$lib/server/db/index.js';
import { matches, teams } from '$lib/server/db/schema.js';
import { getTeams, getUpcomingGames } from '$lib/server/swiss-volley.js';
import { eq, and } from 'drizzle-orm';

/** Sync teams from Swiss Volley API into local DB. */
export async function syncTeams(orgId: string): Promise<number> {
	const svTeams = await getTeams(orgId);

	let synced = 0;
	for (const svTeam of svTeams) {
		const svId = String(svTeam.teamId);
		const gender = svTeam.gender.toUpperCase();
		const leagueMatch = svTeam.league.caption.match(/^(\d+)\.\s*Liga\s*(.*)/i);
		const league = leagueMatch ? `${leagueMatch[1]}L` : svTeam.league.caption;
		const qualifier = leagueMatch?.[2]?.trim() || '';
		const letter = svTeam.caption.replace(svTeam.club.clubCaption, '').trim();
		const name = [league, qualifier, letter, gender].filter(Boolean).join(' ');

		const existing = await db.query.teams.findFirst({
			where: and(eq(teams.orgId, orgId), eq(teams.swissVolleyTeamId, svId))
		});

		if (existing) {
			await db.update(teams).set({ name }).where(eq(teams.id, existing.id));
		} else {
			await db.insert(teams).values({ orgId, name, swissVolleyTeamId: svId });
		}
		synced++;
	}

	return synced;
}

/** Sync matches for a team from Swiss Volley API into local DB. */
export async function syncMatches(
	teamId: number,
	svTeamId: string,
	orgId: string
): Promise<number> {
	const games = await getUpcomingGames(orgId);
	const numericSvTeamId = parseInt(svTeamId);
	const svGames = games.filter(
		(g) => g.teams.home.teamId === numericSvTeamId || g.teams.away.teamId === numericSvTeamId
	);

	let synced = 0;
	for (const game of svGames) {
		const matchId = String(game.gameId);

		const existing = await db.query.matches.findFirst({
			where: and(eq(matches.teamId, teamId), eq(matches.swissVolleyMatchId, matchId))
		});

		const venue = game.hall ? `${game.hall.caption}, ${game.hall.city}` : null;

		if (existing) {
			if (existing.status === 'live' || existing.status === 'finished') continue;

			await db
				.update(matches)
				.set({
					homeTeamName: game.teams.home.caption.trim(),
					guestTeamName: game.teams.away.caption.trim(),
					scheduledAt: game.playDateUtc ? new Date(game.playDateUtc) : null,
					venue,
					league: game.league.caption,
					updatedAt: new Date()
				})
				.where(eq(matches.id, existing.id));
		} else {
			await db.insert(matches).values({
				orgId,
				teamId,
				homeTeamName: game.teams.home.caption.trim(),
				guestTeamName: game.teams.away.caption.trim(),
				scheduledAt: game.playDateUtc ? new Date(game.playDateUtc) : null,
				venue,
				league: game.league.caption,
				swissVolleyMatchId: matchId,
				status: 'upcoming'
			});
		}
		synced++;
	}

	return synced;
}
