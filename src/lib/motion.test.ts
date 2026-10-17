import { describe, it, expect } from 'vitest';
import {
	scaledSeconds,
	revealFrom,
	squashTransform,
	REVEAL_TO,
	SQUASH_FULL,
	SQUASH_PRESS,
	REVEAL_DROP_PX,
	REVEAL_SETTLE
} from './motion.js';

describe('scaledSeconds', () => {
	it('converts ms to seconds at full motion', () => {
		expect(scaledSeconds(420, 1)).toBeCloseTo(0.42);
	});

	it('damps durations with the motion scale', () => {
		expect(scaledSeconds(420, 0.3)).toBeCloseTo(0.126);
	});

	it('is zero when motion is static', () => {
		expect(scaledSeconds(420, 0)).toBe(0);
	});
});

describe('revealFrom', () => {
	it('drops from above and settles from 0.985', () => {
		expect(revealFrom(0, -REVEAL_DROP_PX)).toBe(`translate(0px, -16px) scale(${REVEAL_SETTLE})`);
	});

	it('ends on identity', () => {
		expect(REVEAL_TO).toBe('translate(0px, 0px) scale(1)');
	});
});

describe('squashTransform', () => {
	it('uses 0.88 / 1.12 for the full squash', () => {
		expect(squashTransform(SQUASH_FULL)).toBe('scale(0.88, 1.12)');
	});

	it('uses 1.03 / 0.94 for the CTA press', () => {
		expect(squashTransform(SQUASH_PRESS)).toBe('scale(1.03, 0.94)');
	});
});
