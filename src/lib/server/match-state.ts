import type { MatchState, SetScore } from '$lib/types.js';
import type { matches, scores } from '$lib/server/db/schema.js';

type MatchRow = typeof matches.$inferSelect;
type ScoreRow = typeof scores.$inferSelect;

export function toMatchState(match: MatchRow, score: ScoreRow): MatchState {
	return {
		matchId: match.id,
		homeTeamName: match.homeTeamName,
		guestTeamName: match.guestTeamName,
		homeJerseyColor: match.homeJerseyColor,
		guestJerseyColor: match.guestJerseyColor,
		showJerseyColors: match.showJerseyColors,
		homePoints: score.homePoints,
		guestPoints: score.guestPoints,
		homeSets: score.homeSets,
		guestSets: score.guestSets,
		currentSet: score.currentSet,
		setScores: score.setScores as SetScore[],
		serviceTeam: score.serviceTeam,
		status: match.status
	};
}
