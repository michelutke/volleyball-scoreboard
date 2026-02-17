import type { MatchState, Team } from './types.js';

const POINTS_TO_WIN_SET = 25;
const POINTS_TO_WIN_TIEBREAK = 15;
const MIN_POINT_DIFF = 2;
const SETS_TO_WIN_MATCH = 3;
const TIEBREAK_SET = 5;

export function isTiebreak(currentSet: number): boolean {
	return currentSet === TIEBREAK_SET;
}

export function pointsToWin(currentSet: number): number {
	return isTiebreak(currentSet) ? POINTS_TO_WIN_TIEBREAK : POINTS_TO_WIN_SET;
}

export function isSetOver(homePoints: number, guestPoints: number, currentSet: number): boolean {
	const target = pointsToWin(currentSet);
	const maxPoints = Math.max(homePoints, guestPoints);
	const diff = Math.abs(homePoints - guestPoints);
	return maxPoints >= target && diff >= MIN_POINT_DIFF;
}

export function setWinner(homePoints: number, guestPoints: number, currentSet: number): Team | null {
	if (!isSetOver(homePoints, guestPoints, currentSet)) return null;
	return homePoints > guestPoints ? 'home' : 'guest';
}

export function isMatchOver(homeSets: number, guestSets: number): boolean {
	return homeSets >= SETS_TO_WIN_MATCH || guestSets >= SETS_TO_WIN_MATCH;
}

export function matchWinner(homeSets: number, guestSets: number): Team | null {
	if (!isMatchOver(homeSets, guestSets)) return null;
	return homeSets >= SETS_TO_WIN_MATCH ? 'home' : 'guest';
}

export function addPoint(state: MatchState, team: Team): MatchState {
	if (isMatchOver(state.homeSets, state.guestSets)) return state;

	const next = structuredClone(state);

	if (team === 'home') {
		next.homePoints++;
	} else {
		next.guestPoints++;
	}

	// Service switches to scoring team
	next.serviceTeam = team;

	// Check if set is over
	const winner = setWinner(next.homePoints, next.guestPoints, next.currentSet);
	if (winner) {
		// Record set score
		const setScores = [...next.setScores];
		setScores.push({ home: next.homePoints, guest: next.guestPoints });
		next.setScores = setScores;

		if (winner === 'home') {
			next.homeSets++;
		} else {
			next.guestSets++;
		}

		// Check match over
		if (isMatchOver(next.homeSets, next.guestSets)) {
			next.status = 'finished';
		} else {
			next.currentSet++;
			next.homePoints = 0;
			next.guestPoints = 0;
		}
	}

	return next;
}

export function removePoint(state: MatchState, team: Team): MatchState {
	const next = structuredClone(state);

	if (team === 'home' && next.homePoints > 0) {
		next.homePoints--;
	} else if (team === 'guest' && next.guestPoints > 0) {
		next.guestPoints--;
	}

	return next;
}

export function resetMatch(state: MatchState): MatchState {
	return {
		...state,
		homePoints: 0,
		guestPoints: 0,
		homeSets: 0,
		guestSets: 0,
		currentSet: 1,
		setScores: [],
		serviceTeam: 'home',
		status: 'live'
	};
}

export function createInitialState(matchId: number): MatchState {
	return {
		matchId,
		homeTeamName: 'Heim',
		guestTeamName: 'Gast',
		homeJerseyColor: '#1e40af',
		guestJerseyColor: '#dc2626',
		showJerseyColors: true,
		homePoints: 0,
		guestPoints: 0,
		homeSets: 0,
		guestSets: 0,
		currentSet: 1,
		setScores: [],
		serviceTeam: 'home',
		showSetScores: false,
		overlayBg: '#1a1a1a',
		overlayBg2: '#1a1a1a',
		overlayBgGradient: false,
		overlayText: '#ffffff',
		overlayRounded: false,
		overlayDivider: '#2a2a2a',
		overlaySatsBg: '#1a1a1a',
		overlaySetScoreBg: '#1a1a1a',
		status: 'live'
	};
}
