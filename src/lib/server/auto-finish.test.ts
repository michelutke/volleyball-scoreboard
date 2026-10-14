import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';

const updateSetMock = vi.hoisted(() => vi.fn());
const updateWhereMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db/index.js', () => ({
	db: { update: () => ({ set: updateSetMock }) }
}));

const { autoFinishStale, GUEST_LINK_GRACE_MS } = await import('./auto-finish');

const dialect = new PgDialect();
const now = new Date('2026-10-14T20:00:00.000Z');

describe('autoFinishStale', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		updateSetMock.mockReturnValue({ where: updateWhereMock });
		updateWhereMock.mockResolvedValue(undefined);
	});

	it('finishes stale live matches and stamps finishedAt without touching the token', async () => {
		await autoFinishStale('org-1', now);
		expect(updateSetMock.mock.calls[0][0]).toEqual({ status: 'finished', finishedAt: now, updatedAt: now });
		const { sql, params } = dialect.sqlToQuery(updateWhereMock.mock.calls[0][0]);
		expect(sql).toBe(
			'("matches"."org_id" = $1 and "matches"."status" = $2 and "matches"."scheduled_at" is not null and "matches"."scheduled_at" < $3)'
		);
		expect(params).toEqual(['org-1', 'live', '2026-10-12T20:00:00.000Z']);
	});

	it('clears the tokens of matches finished longer than the grace period', async () => {
		await autoFinishStale('org-1', now);
		expect(updateSetMock.mock.calls[1][0]).toEqual({ controlToken: null });
		const { sql, params } = dialect.sqlToQuery(updateWhereMock.mock.calls[1][0]);
		expect(sql).toBe(
			'("matches"."org_id" = $1 and "matches"."status" = $2 and "matches"."control_token" is not null and ("matches"."finished_at" is null or "matches"."finished_at" < $3))'
		);
		expect(params).toEqual(['org-1', 'finished', '2026-10-14T19:50:00.000Z']);
		expect(GUEST_LINK_GRACE_MS).toBe(10 * 60 * 1000);
	});
});
