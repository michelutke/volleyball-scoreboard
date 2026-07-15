import { describe, it, expect, vi, beforeEach } from 'vitest';

const findFirstMock = vi.hoisted(() => vi.fn());
const verifyMobileTokenMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db/index.js', () => ({
	db: { query: { settings: { findFirst: findFirstMock } } }
}));

vi.mock('$lib/server/mobile-auth', () => ({
	verifyMobileToken: verifyMobileTokenMock
}));

const { GET } = await import('./+server.js');

function makeRequest(headers: Record<string, string>): Request {
	return new Request('http://localhost/api/mobile/overlay-info', { headers });
}

describe('GET /api/mobile/overlay-info', () => {
	beforeEach(() => {
		findFirstMock.mockReset();
		verifyMobileTokenMock.mockReset();
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
		expect(findFirstMock).not.toHaveBeenCalled();
	});

	it('returns 404 when no overlay slug is configured', async () => {
		verifyMobileTokenMock.mockResolvedValue('org-1');
		findFirstMock.mockResolvedValueOnce(undefined);
		const response = await GET({
			request: makeRequest({ authorization: 'Bearer good-token' })
		} as Parameters<typeof GET>[0]);
		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: 'No overlay slug configured' });
	});

	it('returns 200 with slug and orgName', async () => {
		verifyMobileTokenMock.mockResolvedValue('org-1');
		findFirstMock
			.mockResolvedValueOnce({ value: 'my-slug' })
			.mockResolvedValueOnce({ value: 'My Club' });
		const response = await GET({
			request: makeRequest({ authorization: 'Bearer good-token' })
		} as Parameters<typeof GET>[0]);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ slug: 'my-slug', orgName: 'My Club' });
	});

	it('returns 200 with empty orgName when clubName is not set', async () => {
		verifyMobileTokenMock.mockResolvedValue('org-1');
		findFirstMock.mockResolvedValueOnce({ value: 'my-slug' }).mockResolvedValueOnce(undefined);
		const response = await GET({
			request: makeRequest({ authorization: 'Bearer good-token' })
		} as Parameters<typeof GET>[0]);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ slug: 'my-slug', orgName: '' });
	});
});
