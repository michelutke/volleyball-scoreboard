import { describe, it, expect, vi, beforeEach } from 'vitest';

const getClubNameMock = vi.hoisted(() => vi.fn());
const verifyMobileTokenMock = vi.hoisted(() => vi.fn());
const ensureOverlaySlugMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/overlay-slug', () => ({
	ensureOverlaySlug: ensureOverlaySlugMock
}));

vi.mock('$lib/server/match-service', () => ({
	getClubName: getClubNameMock
}));

vi.mock('$lib/server/mobile-auth', () => ({
	verifyMobileToken: verifyMobileTokenMock
}));

vi.mock('$lib/server/billing', () => ({ getBillingStatus: vi.fn().mockResolvedValue('allowed') }));

const { GET } = await import('./+server.js');

function makeRequest(headers: Record<string, string>): Request {
	return new Request('http://localhost/api/mobile/overlay-info', { headers });
}

describe('GET /api/mobile/overlay-info', () => {
	beforeEach(() => {
		getClubNameMock.mockReset();
		verifyMobileTokenMock.mockReset();
		ensureOverlaySlugMock.mockReset();
		ensureOverlaySlugMock.mockResolvedValue('my-slug');
	});

	it('returns 401 when no Authorization header', async () => {
		const response = await GET({ request: makeRequest({}) } as Parameters<typeof GET>[0]);
		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: 'Unauthorized' });
		expect(verifyMobileTokenMock).not.toHaveBeenCalled();
	});

	it('returns 401 when Authorization header is not a Bearer token', async () => {
		const response = await GET({
			request: makeRequest({ authorization: 'Basic abc' })
		} as Parameters<typeof GET>[0]);
		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: 'Unauthorized' });
		expect(verifyMobileTokenMock).not.toHaveBeenCalled();
	});

	it('returns 401 when the token fails verification', async () => {
		verifyMobileTokenMock.mockResolvedValue(null);
		const response = await GET({
			request: makeRequest({ authorization: 'Bearer bad-token' })
		} as Parameters<typeof GET>[0]);
		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: 'Unauthorized' });
		expect(verifyMobileTokenMock).toHaveBeenCalledWith('bad-token');
		expect(getClubNameMock).not.toHaveBeenCalled();
	});

	it('provisions the org slug so old orgs never get a 404', async () => {
		verifyMobileTokenMock.mockResolvedValue({ orgId: 'org-1', sub: 'user-1', roles: [] });
		getClubNameMock.mockResolvedValueOnce('');
		const response = await GET({
			request: makeRequest({ authorization: 'Bearer good-token' })
		} as Parameters<typeof GET>[0]);
		expect(ensureOverlaySlugMock).toHaveBeenCalledWith('org-1');
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ slug: 'my-slug', orgName: '' });
	});

	it('returns 200 with slug and orgName', async () => {
		verifyMobileTokenMock.mockResolvedValue({ orgId: 'org-1', sub: 'user-1', roles: [] });
		getClubNameMock.mockResolvedValueOnce('My Club');
		const response = await GET({
			request: makeRequest({ authorization: 'Bearer good-token' })
		} as Parameters<typeof GET>[0]);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ slug: 'my-slug', orgName: 'My Club' });
	});

	it('returns 200 with empty orgName when clubName is not set', async () => {
		verifyMobileTokenMock.mockResolvedValue({ orgId: 'org-1', sub: 'user-1', roles: [] });
		getClubNameMock.mockResolvedValueOnce('');
		const response = await GET({
			request: makeRequest({ authorization: 'Bearer good-token' })
		} as Parameters<typeof GET>[0]);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ slug: 'my-slug', orgName: '' });
	});
});
