import { db } from '$lib/server/db/index.js';
import { matches, scores } from '$lib/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';
import type { MatchListItem } from '$lib/types.js';

type MatchRow = typeof matches.$inferSelect;

/** Enrich match rows with latest score data to produce MatchListItems. */
export async function toMatchListItems(matchRows: MatchRow[]): Promise<MatchListItem[]> {
	return Promise.all(
		matchRows.map(async (m) => {
			const latestScore = await db.query.scores.findFirst({
				where: eq(scores.matchId, m.id),
				orderBy: desc(scores.createdAt)
			});
			return {
				id: m.id,
				homeTeamName: m.homeTeamName,
				guestTeamName: m.guestTeamName,
				status: m.status as MatchListItem['status'],
				scheduledAt: m.scheduledAt?.toISOString() ?? null,
				venue: m.venue,
				league: m.league,
				swissVolleyMatchId: m.swissVolleyMatchId,
				homeSets: latestScore?.homeSets ?? null,
				guestSets: latestScore?.guestSets ?? null
			};
		})
	);
}
