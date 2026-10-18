import { describe, it, expect } from 'vitest';
import type { MatchState } from '$lib/types.js';
import { isPause, isSetBreak, teamAlert } from './state.js';

function match(overrides: Partial<MatchState> = {}): MatchState {
	return {
		matchId: 1,
		homeTeamName: 'Lindaren Volley Amriswil',
		guestTeamName: 'Volley Schönenwerd',
		homeJerseyColor: '#000000',
		guestJerseyColor: '#ffffff',
		showJerseyColors: false,
		homePoints: 10,
		guestPoints: 8,
		homeSets: 0,
		guestSets: 0,
		currentSet: 1,
		setScores: [],
		serviceTeam: 'home',
		showSetScores: false,
		overlayBg: '#000000',
		overlayBg2: '#000000',
		overlayBgGradient: false,
		overlayText: '#ffffff',
		overlayRounded: false,
		overlayDivider: '#000000',
		overlaySatsBg: '#000000',
		overlaySetScoreBg: '#000000',
		homeTeamLogo: null,
		guestTeamLogo: null,
		scoreColor: '#000000',
		scoreColor2: '#000000',
		scoreColorGradient: false,
		designTemplateId: null,
		status: 'live',
		...overrides
	};
}

describe('teamAlert', () => {
	it('teamAlert_noPointThreshold_returnsNull', () => {
		expect(teamAlert(match(), null)).toBeNull();
	});

	it('teamAlert_guestAt24Leading_returnsGuestSetPoint', () => {
		expect(teamAlert(match({ homePoints: 22, guestPoints: 24 }), null)).toEqual({ team: 'guest', kind: 'set' });
	});

	it('teamAlert_24All_returnsNull', () => {
		expect(teamAlert(match({ homePoints: 24, guestPoints: 24 }), null)).toBeNull();
	});

	it('teamAlert_tiebreakAt14_returnsMatchPoint', () => {
		const m = match({ currentSet: 5, homeSets: 2, guestSets: 2, homePoints: 14, guestPoints: 12 });
		expect(teamAlert(m, null)).toEqual({ team: 'home', kind: 'match' });
	});

	it('teamAlert_timeoutDuringSetPoint_timeoutWins', () => {
		const m = match({ homePoints: 24, guestPoints: 20 });
		expect(teamAlert(m, 'guest')).toEqual({ team: 'guest', kind: 'timeout' });
	});

	it('teamAlert_finishedMatch_returnsNull', () => {
		expect(teamAlert(match({ status: 'finished', homePoints: 25, guestPoints: 20 }), null)).toBeNull();
	});
});

describe('isPause', () => {
	it('isPause_ballInPlay_false', () => {
		expect(isPause(match(), null)).toBe(false);
	});

	it('isPause_timeoutRunning_true', () => {
		expect(isPause(match(), 'home')).toBe(true);
	});

	it('isPause_zeroZeroAfterFinishedSet_true', () => {
		const m = match({ homePoints: 0, guestPoints: 0, currentSet: 2, setScores: [{ home: 25, guest: 21 }] });
		expect(isSetBreak(m)).toBe(true);
		expect(isPause(m, null)).toBe(true);
	});

	it('isPause_zeroZeroBeforeFirstSet_false', () => {
		expect(isPause(match({ homePoints: 0, guestPoints: 0 }), null)).toBe(false);
	});

	it('isPause_finishedMatch_true', () => {
		expect(isPause(match({ status: 'finished' }), null)).toBe(true);
	});
});
