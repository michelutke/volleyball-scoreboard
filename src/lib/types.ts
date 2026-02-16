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
	showSetScores: boolean;
	status: MatchStatus;
}

export interface TimelineEvent {
	type: 'point' | 'timeout';
	team: Team;
	homePoints: number;
	guestPoints: number;
}

export interface SetTimeline {
	set: number;
	events: TimelineEvent[];
	finalScore: SetScore | null;
}

export type SSEEvent =
	| { type: 'score'; data: MatchState }
	| { type: 'timeout'; data: { team: Team; teamName: string; active: boolean } }
	| { type: 'match'; data: MatchState };
