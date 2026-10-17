import { describe, it, expect, vi, beforeEach } from 'vitest';

const retrieveMock = vi.hoisted(() => vi.fn());
const insertedValues = vi.hoisted(() => [] as Array<{ orgId: string; key: string; value: string }>);
const selectRows = vi.hoisted(() => ({ rows: [] as Array<{ value: string }> }));

vi.mock('$env/dynamic/private', () => ({ env: { DATABASE_URL: 'postgres://test' } }));
vi.mock('$lib/server/stripe', () => ({
	getStripe: () => ({ checkout: { sessions: { retrieve: retrieveMock } } })
}));
vi.mock('$lib/server/db', () => ({
	db: {
		select: () => ({ from: () => ({ where: () => Promise.resolve(selectRows.rows) }) }),
		insert: () => ({
			values: (v: { orgId: string; key: string; value: string }) => {
				insertedValues.push(v);
				return { onConflictDoUpdate: () => Promise.resolve() };
			}
		})
	}
}));

const { verifyAndActivateSession, SessionOrgMismatchError, applySubscriptionStatus } = await import('./billing');

function completeSession(subscription: unknown, orgId = 'org-1') {
	return { metadata: { orgId }, status: 'complete', payment_status: 'paid', subscription };
}

describe('verifyAndActivateSession', () => {
	beforeEach(() => {
		retrieveMock.mockReset();
		insertedValues.length = 0;
		selectRows.rows = [];
	});

	it('expands the subscription when retrieving the session', async () => {
		retrieveMock.mockResolvedValue(completeSession({ status: 'active' }));
		await verifyAndActivateSession('cs_1');
		expect(retrieveMock).toHaveBeenCalledWith('cs_1', { expand: ['subscription'] });
	});

	it('writes nothing and returns false when a replayed session has a canceled subscription', async () => {
		retrieveMock.mockResolvedValue(completeSession({ status: 'canceled' }));
		expect(await verifyAndActivateSession('cs_1')).toBe(false);
		expect(insertedValues).toEqual([]);
	});

	it.each(['active', 'trialing'])('stores %s and returns true for a live subscription', async (status) => {
		retrieveMock.mockResolvedValue(completeSession({ status }));
		expect(await verifyAndActivateSession('cs_1')).toBe(true);
		expect(insertedValues).toEqual([{ orgId: 'org-1', key: 'subscriptionStatus', value: status }]);
	});

	it('does nothing when the session has no subscription', async () => {
		retrieveMock.mockResolvedValue(completeSession(null));
		expect(await verifyAndActivateSession('cs_1')).toBe(false);
		expect(insertedValues).toEqual([]);
	});

	it('does nothing when the session is not complete', async () => {
		retrieveMock.mockResolvedValue({ ...completeSession({ status: 'active' }), status: 'open', payment_status: 'unpaid' });
		expect(await verifyAndActivateSession('cs_1')).toBe(false);
		expect(insertedValues).toEqual([]);
	});

	it('throws SessionOrgMismatchError and writes nothing for another org', async () => {
		retrieveMock.mockResolvedValue(completeSession({ status: 'active' }, 'org-2'));
		await expect(verifyAndActivateSession('cs_1', 'org-1')).rejects.toBeInstanceOf(SessionOrgMismatchError);
		expect(insertedValues).toEqual([]);
	});

	it('activates when the expected org matches', async () => {
		retrieveMock.mockResolvedValue(completeSession({ status: 'active' }));
		expect(await verifyAndActivateSession('cs_1', 'org-1')).toBe(true);
	});
});

describe('applySubscriptionStatus', () => {
	beforeEach(() => {
		insertedValues.length = 0;
		selectRows.rows = [];
	});

	it('stores status and event time when no event was applied yet', async () => {
		expect(await applySubscriptionStatus('org-1', 'active', 100)).toBe(true);
		expect(insertedValues).toEqual([
			{ orgId: 'org-1', key: 'subscriptionStatus', value: 'active' },
			{ orgId: 'org-1', key: 'subscriptionEventAt', value: '100' }
		]);
	});

	it('ignores an event older than the last applied one', async () => {
		selectRows.rows = [{ value: '200' }];
		expect(await applySubscriptionStatus('org-1', 'trialing', 100)).toBe(false);
		expect(insertedValues).toEqual([]);
	});

	it('applies an event newer than the last applied one', async () => {
		selectRows.rows = [{ value: '200' }];
		expect(await applySubscriptionStatus('org-1', 'canceled', 300)).toBe(true);
		expect(insertedValues).toContainEqual({ orgId: 'org-1', key: 'subscriptionEventAt', value: '300' });
	});
});
