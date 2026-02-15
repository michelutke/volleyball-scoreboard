export type Team = 'home' | 'guest';

export type MatchStatus = 'upcoming' | 'live' | 'finished';

export interface SetScore {
	home: number;
	guest: number;
}

export interface MatchState {
	matchId: number;
	homeTeamName: string;
	guestTeamName: string;
	homeJerseyColor: string;
	guestJerseyColor: string;
	showJerseyColors: boolean;
	homePoints: number;
	guestPoints: number;
	homeSets: number;
	guestSets: number;
	currentSet: number;
	setScores: SetScore[];
	serviceTeam: Team;
	status: MatchStatus;
}

export type SSEEvent =
	| { type: 'score'; data: MatchState }
	| { type: 'timeout'; data: { team: Team; active: boolean } }
	| { type: 'match'; data: MatchState };
