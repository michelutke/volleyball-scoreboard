import { describe, it, expect, vi, beforeEach } from 'vitest';

const SessionOrgMismatchError = vi.hoisted(() => class SessionOrgMismatchError extends Error {});
const verifyMock = vi.hoisted(() => vi.fn());

vi.mock('$env/dynamic/private', () => ({ env: { STRIPE_SECRET_KEY: 'sk_test' } }));
vi.mock('$lib/server/billing', () => ({
	verifyAndActivateSession: verifyMock,
	SessionOrgMismatchError
}));

const { POST } = await import('./+server');

function event(body: unknown) {
	return {
		request: new Request('http://localhost/api/billing/verify-session', {
			method: 'POST',
			body: JSON.stringify(body)
		}),
		locals: { orgId: 'org-1' }
	} as unknown as Parameters<typeof POST>[0];
}

describe('POST /api/billing/verify-session', () => {
	beforeEach(() => {
		verifyMock.mockReset();
	});

	it('passes the caller org as expectedOrgId and returns the result', async () => {
		verifyMock.mockResolvedValue(true);
		const response = await POST(event({ sessionId: 'cs_1' }));
		expect(verifyMock).toHaveBeenCalledWith('cs_1', 'org-1');
		expect(await response.json()).toEqual({ ok: true });
	});

	it('returns 403 for a session of another org', async () => {
		verifyMock.mockRejectedValue(new SessionOrgMismatchError());
		await expect(POST(event({ sessionId: 'cs_other' }))).rejects.toMatchObject({ status: 403 });
	});

	it('returns ok false without a sessionId', async () => {
		const response = await POST(event({}));
		expect(await response.json()).toEqual({ ok: false });
		expect(verifyMock).not.toHaveBeenCalled();
	});
});
