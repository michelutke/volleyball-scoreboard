import { describe, it, expect, vi, beforeEach } from 'vitest';

const verifyMobileTokenMock = vi.hoisted(() => vi.fn());
const getBillingStatusMock = vi.hoisted(() => vi.fn());
const envMock = vi.hoisted(() => ({ STRIPE_SECRET_KEY: undefined as string | undefined }));
vi.mock('$lib/server/mobile-auth', () => ({ verifyMobileToken: verifyMobileTokenMock }));
vi.mock('$lib/server/billing', () => ({ getBillingStatus: getBillingStatusMock }));
vi.mock('$env/dynamic/private', () => ({ env: envMock }));

const {
	mobileJson,
	unauthorized,
	authenticateMobile,
	parseMatchId,
	notFound,
	finishedConflict,
	shareUrls,
	shareResponse
} = await import('./mobile-api');

function request(headers: Record<string, string>): Request {
	return new Request('http://localhost/api/mobile/matches', { headers });
}

describe('mobileJson', () => {
	it('sets Cache-Control no-store and the status', async () => {
		const response = mobileJson({ a: 1 }, 201);
		expect(response.status).toBe(201);
		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(await response.json()).toEqual({ a: 1 });
	});

	it('unauthorized is a 401 with the standard body', async () => {
		const response = unauthorized();
		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: 'Unauthorized' });
	});
});

describe('authenticateMobile', () => {
	const identity = { orgId: 'org-1', sub: 'user-1', roles: [] };

	beforeEach(() => {
		verifyMobileTokenMock.mockReset();
		getBillingStatusMock.mockReset();
		envMock.STRIPE_SECRET_KEY = undefined;
	});

	it('returns 401 without an Authorization header', async () => {
		const result = await authenticateMobile(request({}));
		expect((result as Response).status).toBe(401);
		expect(verifyMobileTokenMock).not.toHaveBeenCalled();
	});

	it('returns 401 for a non-Bearer header', async () => {
		const result = await authenticateMobile(request({ authorization: 'Basic abc' }));
		expect((result as Response).status).toBe(401);
		expect(verifyMobileTokenMock).not.toHaveBeenCalled();
	});

	it('returns 401 when the token fails verification', async () => {
		verifyMobileTokenMock.mockResolvedValue(null);
		const result = await authenticateMobile(request({ authorization: 'Bearer tok' }));
		expect((result as Response).status).toBe(401);
	});

	it('passes the bearer token to verifyMobileToken and returns the identity', async () => {
		verifyMobileTokenMock.mockResolvedValue(identity);
		expect(await authenticateMobile(request({ authorization: 'Bearer tok' }))).toBe(identity);
		expect(verifyMobileTokenMock).toHaveBeenCalledWith('tok');
	});

	it('skips the billing check when Stripe is not configured', async () => {
		verifyMobileTokenMock.mockResolvedValue(identity);
		expect(await authenticateMobile(request({ authorization: 'Bearer tok' }))).toBe(identity);
		expect(getBillingStatusMock).not.toHaveBeenCalled();
	});

	it('returns 402 for an org with a blocked subscription', async () => {
		envMock.STRIPE_SECRET_KEY = 'sk_test';
		verifyMobileTokenMock.mockResolvedValue(identity);
		getBillingStatusMock.mockResolvedValue('blocked');
		const result = (await authenticateMobile(request({ authorization: 'Bearer tok' }))) as Response;
		expect(getBillingStatusMock).toHaveBeenCalledWith('org-1');
		expect(result.status).toBe(402);
		expect(await result.json()).toEqual({ error: 'Abo inaktiv' });
	});

	it('returns the identity for an org with an allowed subscription', async () => {
		envMock.STRIPE_SECRET_KEY = 'sk_test';
		verifyMobileTokenMock.mockResolvedValue(identity);
		getBillingStatusMock.mockResolvedValue('allowed');
		expect(await authenticateMobile(request({ authorization: 'Bearer tok' }))).toBe(identity);
	});
});

describe('parseMatchId', () => {
	it('accepts positive integers', () => {
		expect(parseMatchId('7')).toBe(7);
		expect(parseMatchId('2147483647')).toBe(2147483647);
	});

	it('rejects zero, signs, decimals, text and values beyond int4', () => {
		for (const raw of ['0', '-1', '+1', '1.5', 'abc', '', '2147483648', '99999999999']) {
			expect(parseMatchId(raw)).toBeNull();
		}
	});
});

describe('status responses', () => {
	it('notFound is a 404', async () => {
		const response = notFound();
		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: 'Match not found' });
	});

	it('finishedConflict is a 409', async () => {
		const response = finishedConflict();
		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({ error: 'Match is finished' });
	});
});

describe('share helpers', () => {
	it('builds the guest control and match overlay urls', () => {
		expect(shareUrls('https://scorely.ch', 7, 'tok-1')).toEqual({
			controlUrl: 'https://scorely.ch/c/tok-1',
			overlayUrl: 'https://scorely.ch/matches/7/overlay'
		});
	});

	it('maps token results to responses', async () => {
		const ok = shareResponse({ ok: true, token: 'tok-1' }, 'https://scorely.ch', 7);
		expect(ok.status).toBe(200);
		expect(ok.headers.get('cache-control')).toBe('no-store');
		expect(await ok.json()).toEqual({
			controlUrl: 'https://scorely.ch/c/tok-1',
			overlayUrl: 'https://scorely.ch/matches/7/overlay'
		});
		expect(shareResponse({ ok: false, reason: 'not_found' }, 'https://scorely.ch', 7).status).toBe(404);
		expect(shareResponse({ ok: false, reason: 'finished' }, 'https://scorely.ch', 7).status).toBe(409);
	});
});
