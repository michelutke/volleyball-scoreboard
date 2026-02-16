import { db } from '$lib/server/db/index.js';
import { matches, teams } from '$lib/server/db/schema.js';
import { getTeams, getMatches, type SwissVolleyMatch } from '$lib/server/swiss-volley.js';
import { eq, and } from 'drizzle-orm';

/** Sync teams from Swiss Volley API into local DB. Returns count synced. */
export async function syncTeams(clubId: string): Promise<number> {
	const svTeams = await getTeams(clubId);

	for (const svTeam of svTeams) {
		const existing = await db.query.teams.findFirst({
			where: eq(teams.swissVolleyTeamId, svTeam.id)
		});

		if (existing) {
			await db.update(teams).set({ name: svTeam.name }).where(eq(teams.id, existing.id));
		} else {
			await db.insert(teams).values({ name: svTeam.name, swissVolleyTeamId: svTeam.id });
		}
	}

	return svTeams.length;
}

function formatVenue(svMatch: SwissVolleyMatch): string | null {
	if (svMatch.hallName) {
		return `${svMatch.hallName}, ${svMatch.hallCity ?? ''}`.trim();
	}
	return svMatch.venue || null;
}

/** Sync matches for a team from Swiss Volley API into local DB. Returns count synced. */
export async function syncMatches(teamId: number, svTeamId: string): Promise<number> {
	const svMatches = await getMatches(svTeamId);

	let synced = 0;
	for (const svMatch of svMatches) {
		const existing = await db.query.matches.findFirst({
			where: and(eq(matches.teamId, teamId), eq(matches.swissVolleyMatchId, svMatch.id))
		});

		if (existing) {
			if (existing.status === 'live' || existing.status === 'finished') continue;

			await db
				.update(matches)
				.set({
					homeTeamName: svMatch.homeTeam,
					guestTeamName: svMatch.guestTeam,
					scheduledAt: svMatch.date ? new Date(svMatch.date) : null,
					venue: formatVenue(svMatch),
					league: svMatch.league,
					updatedAt: new Date()
				})
				.where(eq(matches.id, existing.id));
		} else {
			await db.insert(matches).values({
				teamId,
				homeTeamName: svMatch.homeTeam,
				guestTeamName: svMatch.guestTeam,
				scheduledAt: svMatch.date ? new Date(svMatch.date) : null,
				venue: formatVenue(svMatch),
				league: svMatch.league,
				swissVolleyMatchId: svMatch.id,
				status: 'upcoming'
			});
		}
		synced++;
	}

	return synced;
}
