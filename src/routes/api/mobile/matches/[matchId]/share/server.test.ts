import { describe, it, expect, vi, beforeEach } from 'vitest';

const verifyMobileTokenMock = vi.hoisted(() => vi.fn());
const ensureControlTokenMock = vi.hoisted(() => vi.fn());
const renewControlTokenMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/mobile-auth', () => ({ verifyMobileToken: verifyMobileTokenMock }));
vi.mock('$lib/server/match-service', () => ({
	ensureControlToken: ensureControlTokenMock,
	renewControlToken: renewControlTokenMock
}));

const { POST } = await import('./+server.js');

const IDENTITY = { orgId: 'org-1', sub: 'user-1', roles: [] };

function event(matchId: string, headers: Record<string, string> = { authorization: 'Bearer good' }) {
	const url = `https://scorely.ch/api/mobile/matches/${matchId}/share`;
	return {
		params: { matchId },
		request: new Request(url, { method: 'POST', headers }),
		url: new URL(url)
	} as unknown as Parameters<typeof POST>[0];
}

describe('POST /api/mobile/matches/[matchId]/share', () => {
	beforeEach(() => {
		verifyMobileTokenMock.mockReset();
		ensureControlTokenMock.mockReset();
		renewControlTokenMock.mockReset();
		verifyMobileTokenMock.mockResolvedValue(IDENTITY);
	});

	it('returns 401 without Authorization header', async () => {
		const response = await POST(event('7', {}));
		expect(response.status).toBe(401);
		expect(ensureControlTokenMock).not.toHaveBeenCalled();
	});

	it('returns 401 when the token fails verification (e.g. wrong azp)', async () => {
		verifyMobileTokenMock.mockResolvedValue(null);
		const response = await POST(event('7'));
		expect(response.status).toBe(401);
		expect(ensureControlTokenMock).not.toHaveBeenCalled();
	});

	it('returns 404 for a malformed id', async () => {
		const response = await POST(event('7a'));
		expect(response.status).toBe(404);
		expect(ensureControlTokenMock).not.toHaveBeenCalled();
	});

	it('returns 404 for a match of another org', async () => {
		ensureControlTokenMock.mockResolvedValue({ ok: false, reason: 'not_found' });
		const response = await POST(event('7'));
		expect(response.status).toBe(404);
		expect(ensureControlTokenMock).toHaveBeenCalledWith('org-1', 7);
	});

	it('returns 409 for a finished match', async () => {
		ensureControlTokenMock.mockResolvedValue({ ok: false, reason: 'finished' });
		const response = await POST(event('7'));
		expect(response.status).toBe(409);
	});

	it("returns the link built from ensureControlToken's token and never renews", async () => {
		ensureControlTokenMock.mockResolvedValue({ ok: true, token: 'tok-1' });
		const firstResponse = await POST(event('7'));
		expect(firstResponse.status).toBe(200);
		const first = await firstResponse.json();
		const second = await (await POST(event('7'))).json();
		expect(first).toEqual({
			controlUrl: 'https://scorely.ch/c/tok-1',
			overlayUrl: 'https://scorely.ch/matches/7/overlay'
		});
		expect(second).toEqual(first);
		expect(renewControlTokenMock).not.toHaveBeenCalled();
	});
});
