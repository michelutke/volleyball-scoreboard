import { describe, it, expect, vi } from 'vitest';

vi.mock('$lib/server/db/index.js', () => ({ db: {} }));

const { nextSaturdayEvening } = await import('./service');

describe('nextSaturdayEvening', () => {
	it('returns the coming Saturday 17:30 Swiss summer time', () => {
		expect(nextSaturdayEvening(new Date('2026-10-21T10:00:00Z')).toISOString()).toBe('2026-10-24T15:30:00.000Z');
	});

	it('returns the coming Saturday 17:30 Swiss winter time', () => {
		expect(nextSaturdayEvening(new Date('2026-12-02T10:00:00Z')).toISOString()).toBe('2026-12-05T16:30:00.000Z');
	});

	it('moves to the following week when called on a Saturday', () => {
		expect(nextSaturdayEvening(new Date('2026-10-24T08:00:00Z')).toISOString()).toBe('2026-10-31T16:30:00.000Z');
	});

	it('handles the daylight saving change weekend', () => {
		expect(nextSaturdayEvening(new Date('2026-03-25T10:00:00Z')).toISOString()).toBe('2026-03-28T16:30:00.000Z');
		expect(nextSaturdayEvening(new Date('2026-03-30T10:00:00Z')).toISOString()).toBe('2026-04-04T15:30:00.000Z');
	});
});
