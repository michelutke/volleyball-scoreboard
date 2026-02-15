import { describe, it, expect } from 'vitest';
import {
	addPoint,
	removePoint,
	resetMatch,
	createInitialState,
	isSetOver,
	isMatchOver,
	setWinner,
	matchWinner,
	isTiebreak,
	pointsToWin
} from './volleyball.js';
import type { MatchState } from './types.js';

function state(overrides: Partial<MatchState> = {}): MatchState {
	return { ...createInitialState(1), ...overrides };
}

describe('pointsToWin', () => {
	it('returns 25 for sets 1-4', () => {
		expect(pointsToWin(1)).toBe(25);
		expect(pointsToWin(4)).toBe(25);
	});

	it('returns 15 for tiebreak (set 5)', () => {
		expect(pointsToWin(5)).toBe(15);
	});
});

describe('isTiebreak', () => {
	it('returns true only for set 5', () => {
		expect(isTiebreak(1)).toBe(false);
		expect(isTiebreak(5)).toBe(true);
	});
});

describe('isSetOver', () => {
	it('not over below 25', () => {
		expect(isSetOver(24, 20, 1)).toBe(false);
	});

	it('over at 25 with 2+ diff', () => {
		expect(isSetOver(25, 23, 1)).toBe(true);
		expect(isSetOver(25, 20, 1)).toBe(true);
	});

	it('not over at 25-24 (needs 2 diff)', () => {
		expect(isSetOver(25, 24, 1)).toBe(false);
	});

	it('over at deuce resolution', () => {
		expect(isSetOver(27, 25, 1)).toBe(true);
		expect(isSetOver(30, 28, 1)).toBe(true);
	});

	it('tiebreak ends at 15', () => {
		expect(isSetOver(15, 10, 5)).toBe(true);
		expect(isSetOver(14, 10, 5)).toBe(false);
	});

	it('tiebreak needs 2 diff too', () => {
		expect(isSetOver(15, 14, 5)).toBe(false);
		expect(isSetOver(16, 14, 5)).toBe(true);
	});
});

describe('setWinner', () => {
	it('returns null if set not over', () => {
		expect(setWinner(20, 15, 1)).toBeNull();
	});

	it('returns home if home wins', () => {
		expect(setWinner(25, 20, 1)).toBe('home');
	});

	it('returns guest if guest wins', () => {
		expect(setWinner(23, 25, 1)).toBe('guest');
	});
});

describe('isMatchOver / matchWinner', () => {
	it('not over with less than 3 sets', () => {
		expect(isMatchOver(2, 1)).toBe(false);
		expect(matchWinner(2, 1)).toBeNull();
	});

	it('over when a team reaches 3 sets', () => {
		expect(isMatchOver(3, 1)).toBe(true);
		expect(matchWinner(3, 1)).toBe('home');
		expect(matchWinner(2, 3)).toBe('guest');
	});
});

describe('addPoint', () => {
	it('increments home points', () => {
		const s = state();
		const next = addPoint(s, 'home');
		expect(next.homePoints).toBe(1);
		expect(next.guestPoints).toBe(0);
	});

	it('increments guest points', () => {
		const next = addPoint(state(), 'guest');
		expect(next.guestPoints).toBe(1);
	});

	it('switches service to scoring team', () => {
		const next = addPoint(state({ serviceTeam: 'home' }), 'guest');
		expect(next.serviceTeam).toBe('guest');
	});

	it('auto-completes set at 25-23', () => {
		const s = state({ homePoints: 24, guestPoints: 23 });
		const next = addPoint(s, 'home');
		expect(next.homeSets).toBe(1);
		expect(next.homePoints).toBe(0);
		expect(next.guestPoints).toBe(0);
		expect(next.currentSet).toBe(2);
		expect(next.setScores).toHaveLength(1);
		expect(next.setScores[0]).toEqual({ home: 25, guest: 23 });
	});

	it('does not complete set at 25-24', () => {
		const s = state({ homePoints: 24, guestPoints: 24 });
		const next = addPoint(s, 'home');
		expect(next.homeSets).toBe(0);
		expect(next.homePoints).toBe(25);
		expect(next.currentSet).toBe(1);
	});

	it('completes set at deuce 27-25', () => {
		const s = state({ homePoints: 26, guestPoints: 25 });
		const next = addPoint(s, 'home');
		expect(next.homeSets).toBe(1);
		expect(next.setScores[0]).toEqual({ home: 27, guest: 25 });
	});

	it('ends match when 3rd set is won', () => {
		const s = state({ homePoints: 24, guestPoints: 20, homeSets: 2, currentSet: 3 });
		const next = addPoint(s, 'home');
		expect(next.status).toBe('finished');
		expect(next.homeSets).toBe(3);
	});

	it('does not add points after match is over', () => {
		const s = state({ homeSets: 3, guestSets: 1, status: 'finished' });
		const next = addPoint(s, 'home');
		expect(next.homePoints).toBe(0); // unchanged
	});

	it('handles tiebreak (set 5) at 15 points', () => {
		const s = state({ homePoints: 14, guestPoints: 10, homeSets: 2, guestSets: 2, currentSet: 5 });
		const next = addPoint(s, 'home');
		expect(next.status).toBe('finished');
		expect(next.homeSets).toBe(3);
		expect(next.setScores).toHaveLength(1);
		expect(next.setScores[0]).toEqual({ home: 15, guest: 10 });
	});

	it('does not mutate original state', () => {
		const s = state();
		const next = addPoint(s, 'home');
		expect(s.homePoints).toBe(0);
		expect(next.homePoints).toBe(1);
	});
});

describe('removePoint', () => {
	it('decrements home points', () => {
		const next = removePoint(state({ homePoints: 5 }), 'home');
		expect(next.homePoints).toBe(4);
	});

	it('does not go below 0', () => {
		const next = removePoint(state(), 'home');
		expect(next.homePoints).toBe(0);
	});
});

describe('resetMatch', () => {
	it('resets all scoring state', () => {
		const s = state({
			homePoints: 15,
			guestPoints: 10,
			homeSets: 2,
			guestSets: 1,
			currentSet: 4,
			setScores: [{ home: 25, guest: 20 }],
			status: 'finished'
		});
		const next = resetMatch(s);
		expect(next.homePoints).toBe(0);
		expect(next.guestPoints).toBe(0);
		expect(next.homeSets).toBe(0);
		expect(next.guestSets).toBe(0);
		expect(next.currentSet).toBe(1);
		expect(next.setScores).toEqual([]);
		expect(next.serviceTeam).toBe('home');
		expect(next.status).toBe('live');
	});

	it('preserves team names', () => {
		const s = state({ homeTeamName: 'VBC Thun', guestTeamName: 'VBC Bern' });
		const next = resetMatch(s);
		expect(next.homeTeamName).toBe('VBC Thun');
		expect(next.guestTeamName).toBe('VBC Bern');
	});
});
