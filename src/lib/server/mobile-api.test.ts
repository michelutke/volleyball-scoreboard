import { describe, it, expect, vi, beforeEach } from 'vitest';

const verifyMobileTokenMock = vi.hoisted(() => vi.fn());
vi.mock('$lib/server/mobile-auth', () => ({ verifyMobileToken: verifyMobileTokenMock }));

const { mobileJson, unauthorized, authenticateMobile, parseMatchId, notFound, finishedConflict } =
	await import('./mobile-api');

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
	beforeEach(() => verifyMobileTokenMock.mockReset());

	it('returns null without an Authorization header', async () => {
		expect(await authenticateMobile(request({}))).toBeNull();
		expect(verifyMobileTokenMock).not.toHaveBeenCalled();
	});

	it('returns null for a non-Bearer header', async () => {
		expect(await authenticateMobile(request({ authorization: 'Basic abc' }))).toBeNull();
		expect(verifyMobileTokenMock).not.toHaveBeenCalled();
	});

	it('passes the bearer token to verifyMobileToken', async () => {
		const identity = { orgId: 'org-1', sub: 'user-1', roles: [] };
		verifyMobileTokenMock.mockResolvedValue(identity);
		expect(await authenticateMobile(request({ authorization: 'Bearer tok' }))).toBe(identity);
		expect(verifyMobileTokenMock).toHaveBeenCalledWith('tok');
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
