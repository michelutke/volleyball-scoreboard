import type { MatchState, Team } from '$lib/types.js';

export type AlertKind = 'timeout' | 'match' | 'set';

export interface TeamAlert {
	team: Team;
	kind: AlertKind;
}

export function isAtSetPoint(points: number, otherPoints: number, setNumber: number): boolean {
	const target = setNumber === 5 ? 15 : 25;
	return points >= target - 1 && points > otherPoints;
}

/** A set is over and the next one has not started yet (0:0 after at least one finished set). */
export function isSetBreak(match: MatchState): boolean {
	return (
		match.status === 'live' &&
		match.homePoints === 0 &&
		match.guestPoints === 0 &&
		match.setScores.length > 0
	);
}

/** The ball is not in play: the overlay may show the Scorely logo. */
export function isPause(match: MatchState, timeoutTeam: Team | null): boolean {
	return timeoutTeam !== null || match.status === 'finished' || isSetBreak(match);
}

/** Which team the overlay calls out, and why. A running timeout wins over set or match point. */
export function teamAlert(match: MatchState, timeoutTeam: Team | null): TeamAlert | null {
	if (timeoutTeam) return { team: timeoutTeam, kind: 'timeout' };
	if (match.status !== 'live') return null;
	const team: Team | null = isAtSetPoint(match.homePoints, match.guestPoints, match.currentSet)
		? 'home'
		: isAtSetPoint(match.guestPoints, match.homePoints, match.currentSet)
			? 'guest'
			: null;
	if (!team) return null;
	const setsWon = team === 'home' ? match.homeSets : match.guestSets;
	return { team, kind: setsWon === 2 ? 'match' : 'set' };
}

export const ALERT_LABEL: Record<AlertKind, string> = {
	timeout: 'TIMEOUT',
	match: 'MATCH POINT',
	set: 'SET POINT'
};
