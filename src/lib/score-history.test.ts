import { describe, it, expect } from 'vitest';
import type { MatchState } from '$lib/types.js';
import { applyScoreAction, type ScoreHistoryRow } from './score-history.js';

function state(overrides: Partial<MatchState> = {}): MatchState {
	return {
		homePoints: 0,
		guestPoints: 0,
		homeSets: 0,
		guestSets: 0,
		currentSet: 1,
		setScores: [],
		serviceTeam: 'home',
		status: 'live',
		...overrides
	} as MatchState;
}

function row(homePoints: number, guestPoints: number, at: number): ScoreHistoryRow {
	return { homePoints, guestPoints, homeSets: 0, guestSets: 0, currentSet: 1, createdAt: new Date(at) };
}

describe('applyScoreAction', () => {
	const history = [row(0, 0, 1_000), row(1, 0, 2_000)];

	it('appends the new score after a point', () => {
		const next = applyScoreAction(history, [], 'addPoint', state({ homePoints: 1 }), state({ homePoints: 2 }), new Date(5_000));
		expect(next).toHaveLength(3);
		expect(next![2]).toMatchObject({ homePoints: 2, guestPoints: 0, currentSet: 1, createdAt: new Date(5_000) });
		expect(history).toHaveLength(2);
	});

	it('removes the last score on undo', () => {
		const next = applyScoreAction(history, [], 'undo', state({ homePoints: 1 }), state());
		expect(next).toEqual([history[0]]);
	});

	it('never stamps a point before the newest known event', () => {
		const timeouts = [{ createdAt: new Date(9_000) }];
		const next = applyScoreAction(history, timeouts, 'addPoint', state({ homePoints: 1 }), state({ homePoints: 2 }), new Date(5_000));
		expect(next![2].createdAt).toEqual(new Date(9_001));
	});

	it('asks for a reload on a set change', () => {
		expect(applyScoreAction(history, [], 'addPoint', state({ homePoints: 24 }), state({ currentSet: 2, homeSets: 1 }))).toBeNull();
	});

	it('asks for a reload on a status change', () => {
		expect(applyScoreAction(history, [], 'undo', state({ status: 'finished' }), state())).toBeNull();
	});

	it('asks for a reload on reset', () => {
		expect(applyScoreAction(history, [], 'reset', state({ homePoints: 3 }), state())).toBeNull();
	});
});
