import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { JWT } from '@auth/core/jwt';
import type { Session } from '@auth/core/types';

const getKcOrgIdFromAliasMock = vi.hoisted(() => vi.fn());
const getKcOrgIdForUserMock = vi.hoisted(() => vi.fn());
const getKcOrgIdByScanningMembersMock = vi.hoisted(() => vi.fn());
vi.mock('$lib/server/keycloak-admin', () => ({
	getKcOrgIdFromAlias: getKcOrgIdFromAliasMock,
	getKcOrgIdForUser: getKcOrgIdForUserMock,
	getKcOrgIdByScanningMembers: getKcOrgIdByScanningMembersMock
}));

const { jwtCallback, sessionCallback, deriveIdentity, REFRESH_TOKEN_ERROR } = await import(
	'./auth-tokens'
);
const { sessionRejection } = await import('./auth-session');

const ORG_A = '5f1c1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a5b';
const ORG_B = '9a8b7c6d-1111-4222-8333-444455556666';
const NOW = 1_700_000_000_000;

function accessToken(claims: Record<string, unknown>): string {
	const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
	return `${encode({ alg: 'none' })}.${encode(claims)}.sig`;
}

function tokenResponse(claims: Record<string, unknown>) {
	return new Response(
		JSON.stringify({
			access_token: accessToken(claims),
			refresh_token: 'refresh-2',
			id_token: 'id-2',
			expires_in: 300
		}),
		{ status: 200 }
	);
}

function expiredToken(overrides: Partial<JWT> = {}): JWT {
	return {
		sub: 'user-1',
		orgId: ORG_A,
		roles: ['admin'],
		refreshToken: 'refresh-1',
		idToken: 'id-1',
		accessTokenExpires: NOW - 1000,
		...overrides
	};
}

describe('auth-tokens', () => {
	const fetchMock = vi.fn();

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		vi.stubGlobal('fetch', fetchMock);
		fetchMock.mockReset();
		getKcOrgIdFromAliasMock.mockReset().mockResolvedValue(undefined);
		getKcOrgIdForUserMock.mockReset().mockResolvedValue(undefined);
		getKcOrgIdByScanningMembersMock.mockReset().mockResolvedValue(undefined);
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	describe('deriveIdentity', () => {
		it('reads org_id and realm roles from the access token', async () => {
			const identity = await deriveIdentity(
				accessToken({ sub: 's', org_id: ORG_A, realm_access: { roles: ['admin'] } })
			);
			expect(identity).toMatchObject({ sub: 's', orgId: ORG_A, roles: ['admin'] });
		});

		it('falls back through alias, user lookup and member scan when claims carry no org id', async () => {
			getKcOrgIdByScanningMembersMock.mockResolvedValue(ORG_B);
			const identity = await deriveIdentity(accessToken({ sub: 's', organization: ['club'] }));
			expect(identity.orgId).toBe(ORG_B);
			expect(getKcOrgIdFromAliasMock).toHaveBeenCalledWith('club');
			expect(getKcOrgIdForUserMock).toHaveBeenCalledWith('s');
		});
	});

	describe('jwtCallback', () => {
		it('stores refresh token and expiry at OIDC login', async () => {
			const token = await jwtCallback({
				token: { sub: 'user-1' },
				account: {
					provider: 'keycloak',
					type: 'oidc',
					providerAccountId: 'user-1',
					access_token: accessToken({ sub: 'user-1', org_id: ORG_A }),
					refresh_token: 'refresh-1',
					id_token: 'id-1',
					expires_at: NOW / 1000 + 300
				}
			});
			expect(token).toMatchObject({
				orgId: ORG_A,
				refreshToken: 'refresh-1',
				idToken: 'id-1',
				accessTokenExpires: NOW + 300_000
			});
			expect(fetchMock).not.toHaveBeenCalled();
		});

		it('stores refresh token and expiry at credentials login', async () => {
			const token = await jwtCallback({
				token: { sub: 'user-1' },
				account: { provider: 'credentials', type: 'credentials', providerAccountId: 'user-1' },
				user: {
					id: 'user-1',
					orgId: ORG_A,
					roles: ['admin'],
					refreshToken: 'refresh-1',
					idToken: 'id-1',
					accessTokenExpires: NOW + 300_000
				}
			});
			expect(token).toMatchObject({
				orgId: ORG_A,
				roles: ['admin'],
				refreshToken: 'refresh-1',
				accessTokenExpires: NOW + 300_000
			});
			expect(fetchMock).not.toHaveBeenCalled();
		});

		it('returns a still valid token without calling Keycloak', async () => {
			const token = expiredToken({ accessTokenExpires: NOW + 120_000 });
			expect(await jwtCallback({ token })).toEqual(token);
			expect(fetchMock).not.toHaveBeenCalled();
		});

		it('refreshes an expired token and re-derives org and roles', async () => {
			fetchMock.mockResolvedValue(
				tokenResponse({ sub: 'user-1', org_id: ORG_B, realm_access: { roles: ['member'] } })
			);
			const token = await jwtCallback({ token: expiredToken() });

			expect(fetchMock).toHaveBeenCalledTimes(1);
			const [url, init] = fetchMock.mock.calls[0];
			expect(String(url)).toMatch(/\/protocol\/openid-connect\/token$/);
			const body = init.body as URLSearchParams;
			expect(body.get('grant_type')).toBe('refresh_token');
			expect(body.get('refresh_token')).toBe('refresh-1');
			expect(token).toMatchObject({
				orgId: ORG_B,
				roles: ['member'],
				refreshToken: 'refresh-2',
				idToken: 'id-2',
				accessTokenExpires: NOW + 300_000
			});
			expect(token.error).toBeUndefined();
		});

		it('drops admin when the role was removed in Keycloak', async () => {
			fetchMock.mockResolvedValue(
				tokenResponse({ sub: 'user-1', org_id: ORG_A, realm_access: { roles: ['member'] } })
			);
			const token = await jwtCallback({ token: expiredToken() });
			expect((token.roles ?? []).includes('admin')).toBe(false);
		});

		it('clears the org when the user was removed from it', async () => {
			fetchMock.mockResolvedValue(tokenResponse({ sub: 'user-1', realm_access: { roles: [] } }));
			const token = await jwtCallback({ token: expiredToken() });
			expect(token.orgId).toBeUndefined();
			const session = { user: { orgId: token.orgId }, expires: '' } as Session;
			expect(sessionRejection(session)).toBe('OrgNotFound');
		});

		it('marks the token as errored when Keycloak rejects the refresh token', async () => {
			fetchMock.mockResolvedValue(
				new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 })
			);
			const token = await jwtCallback({ token: expiredToken() });
			expect(token.error).toBe(REFRESH_TOKEN_ERROR);
		});

		it.each([
			[401, { error: 'invalid_client' }],
			[403, null],
			[429, null]
		])('keeps the session when the refresh fails with %s but not invalid_grant', async (status, body) => {
			fetchMock.mockResolvedValue(new Response(body ? JSON.stringify(body) : 'blocked', { status }));
			const token = await jwtCallback({ token: expiredToken() });
			expect(token.error).toBeUndefined();
		});

		it('marks legacy tokens without a refresh token as errored without calling Keycloak', async () => {
			const token = await jwtCallback({ token: { sub: 'user-1', orgId: ORG_A, roles: ['admin'] } });
			expect(token.error).toBe(REFRESH_TOKEN_ERROR);
			expect(fetchMock).not.toHaveBeenCalled();
		});

		it('does not retry once errored', async () => {
			const token = await jwtCallback({ token: expiredToken({ error: REFRESH_TOKEN_ERROR }) });
			expect(token.error).toBe(REFRESH_TOKEN_ERROR);
			expect(fetchMock).not.toHaveBeenCalled();
		});

		it('keeps the current token when Keycloak is unreachable or errors', async () => {
			fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));
			expect((await jwtCallback({ token: expiredToken() })).error).toBeUndefined();
			fetchMock.mockResolvedValueOnce(new Response('', { status: 503 }));
			expect((await jwtCallback({ token: expiredToken() })).error).toBeUndefined();
		});
	});

	describe('sessionCallback', () => {
		const baseSession = { user: { email: 'a@b.c' }, expires: '2030-01-01' } as Session;

		it('exposes org, roles and error but never idToken or refreshToken', () => {
			const session = sessionCallback({
				session: structuredClone(baseSession),
				token: expiredToken({ error: REFRESH_TOKEN_ERROR })
			});
			expect(session.user.orgId).toBe(ORG_A);
			expect(session.user.roles).toEqual(['admin']);
			expect(session.error).toBe(REFRESH_TOKEN_ERROR);
			const serialized = JSON.stringify(session);
			expect(serialized).not.toContain('id-1');
			expect(serialized).not.toContain('refresh-1');
			expect(serialized).not.toContain('idToken');
			expect(serialized).not.toContain('refreshToken');
		});
	});

	describe('sessionRejection', () => {
		it('rejects errored sessions as expired and passes valid ones', () => {
			const valid = { user: { orgId: ORG_A }, expires: '' } as Session;
			expect(sessionRejection(valid)).toBeNull();
			expect(sessionRejection({ ...valid, error: REFRESH_TOKEN_ERROR })).toBe('SessionExpired');
		});
	});
});
