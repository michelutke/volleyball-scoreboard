import { describe, it, expect } from 'vitest';
import {
	heroForward,
	ease,
	squash,
	NAV_END_MS,
	CONTACT_UP_MS,
	CONTACT_LO_MS,
	BALL_UP,
	BALL_LO,
	BALL_R,
	O_CENTER,
	O_R
} from './reveal.js';

describe('heroForward', () => {
	it('starts as the o of the wordmark with all letters visible', () => {
		const f = heroForward(0);
		expect(f.up).toEqual({ x: O_CENTER[0], y: O_CENTER[1], r: O_R });
		expect(f.lo).toEqual({ x: O_CENTER[0], y: O_CENTER[1], r: O_R });
		for (const l of Object.values(f.letters)) expect(l.opacity).toBe(1);
	});

	it('ends with both balls tangent to the block edge and letters gone', () => {
		const f = heroForward(NAV_END_MS);
		expect(f.up.x).toBeCloseTo(BALL_UP[0], 5);
		expect(f.up.y).toBeCloseTo(BALL_UP[1], 5);
		expect(f.lo.x).toBeCloseTo(BALL_LO[0], 5);
		expect(f.lo.y).toBeCloseTo(BALL_LO[1], 5);
		expect(f.up.r).toBe(BALL_R);
		for (const l of Object.values(f.letters)) expect(l.opacity).toBe(0);
	});

	it('splits the o into a colon of pitch 62 by 600 ms', () => {
		const f = heroForward(600);
		expect(f.lo.y - f.up.y).toBeCloseTo(62, 5);
		expect(f.up.r).toBeCloseTo(BALL_R, 5);
	});

	it('uses the documented contact times', () => {
		expect(CONTACT_UP_MS).toBe(1500);
		expect(CONTACT_LO_MS).toBe(1680);
		expect(NAV_END_MS).toBe(1680);
	});
});

describe('ease and squash', () => {
	it('ease is clamped to 0..1', () => {
		expect(ease('snap', -1)).toBeCloseTo(0, 5);
		expect(ease('mass', 2)).toBeCloseTo(1, 5);
	});

	it('squash peaks at 0.88 / 1.12 80 ms after contact and recovers by 240 ms', () => {
		expect(squash(80, 0)[0]).toBeCloseTo(0.88, 5);
		expect(squash(80, 0)[1]).toBeCloseTo(1.12, 5);
		expect(squash(240, 0)).toEqual([1, 1]);
	});
});
