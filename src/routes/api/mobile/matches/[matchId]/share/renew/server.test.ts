import { describe, it, expect, vi, beforeEach } from 'vitest';

const verifyMobileTokenMock = vi.hoisted(() => vi.fn());
const ensureControlTokenMock = vi.hoisted(() => vi.fn());
const renewControlTokenMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/mobile-auth', () => ({ verifyMobileToken: verifyMobileTokenMock }));
vi.mock('$lib/server/match-service', () => ({
	ensureControlToken: ensureControlTokenMock,
	renewControlToken: renewControlTokenMock
}));

vi.mock('$lib/server/billing', () => ({ getBillingStatus: vi.fn().mockResolvedValue('allowed') }));

const { POST } = await import('./+server.js');

const IDENTITY = { orgId: 'org-1', sub: 'user-1', roles: [] };

function event(matchId: string, headers: Record<string, string> = { authorization: 'Bearer good' }) {
	const url = `https://scorely.ch/api/mobile/matches/${matchId}/share/renew`;
	return {
		params: { matchId },
		request: new Request(url, { method: 'POST', headers }),
		url: new URL(url)
	} as unknown as Parameters<typeof POST>[0];
}

describe('POST /api/mobile/matches/[matchId]/share/renew', () => {
	beforeEach(() => {
		verifyMobileTokenMock.mockReset();
		ensureControlTokenMock.mockReset();
		renewControlTokenMock.mockReset();
		verifyMobileTokenMock.mockResolvedValue(IDENTITY);
	});

	it('returns 401 without Authorization header', async () => {
		const response = await POST(event('7', {}));
		expect(response.status).toBe(401);
		expect(renewControlTokenMock).not.toHaveBeenCalled();
	});

	it('returns 401 when the token fails verification (e.g. wrong azp)', async () => {
		verifyMobileTokenMock.mockResolvedValue(null);
		const response = await POST(event('7'));
		expect(response.status).toBe(401);
		expect(renewControlTokenMock).not.toHaveBeenCalled();
	});

	it('returns 404 for a match of another org', async () => {
		renewControlTokenMock.mockResolvedValue({ ok: false, reason: 'not_found' });
		const response = await POST(event('7'));
		expect(response.status).toBe(404);
		expect(renewControlTokenMock).toHaveBeenCalledWith('org-1', 7);
	});

	it('returns 409 for a finished match', async () => {
		renewControlTokenMock.mockResolvedValue({ ok: false, reason: 'finished' });
		const response = await POST(event('7'));
		expect(response.status).toBe(409);
	});

	it('returns a link with the new token and never reuses', async () => {
		renewControlTokenMock.mockResolvedValue({ ok: true, token: 'tok-new' });
		const response = await POST(event('7'));
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			controlUrl: 'https://scorely.ch/c/tok-new',
			overlayUrl: 'https://scorely.ch/matches/7/overlay'
		});
		expect(ensureControlTokenMock).not.toHaveBeenCalled();
	});
});
