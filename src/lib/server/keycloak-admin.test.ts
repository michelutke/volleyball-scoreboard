import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const findFirstMock = vi.hoisted(() => vi.fn());

vi.mock('$env/dynamic/private', () => ({
	env: {
		KEYCLOAK_ADMIN_URL: 'https://kc.test',
		KEYCLOAK_ADMIN_CLIENT_ID: 'admin-client',
		KEYCLOAK_ADMIN_CLIENT_SECRET: 'secret',
		KEYCLOAK_REALM: 'scoring',
		DATABASE_URL: 'postgres://test:test@localhost:5432/test'
	}
}));

vi.mock('$lib/server/db', () => ({
	db: { query: { settings: { findFirst: findFirstMock } } }
}));

const {
	getKcOrgId,
	listOrgMembers,
	removeFromOrg,
	deleteUser,
	assignAdminRole,
	listUsersWithRole,
	inviteUserByEmail,
	listKcOrgIdsForUser
} = await import('./keycloak-admin');

const UUID = '5f1c1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a5b';
const DEFAULT_KC_ORG = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('getKcOrgId', () => {
	beforeEach(() => findFirstMock.mockReset());

	it('returns the stored kcOrgId when a settings row exists', async () => {
		findFirstMock.mockResolvedValue({ value: 'stored-kc-org' });
		expect(await getKcOrgId('org-a')).toBe('stored-kc-org');
	});

	it('returns null for a non UUID orgId without a row, never the default org value', async () => {
		findFirstMock.mockImplementation(async () => null);
		expect(await getKcOrgId('some-club')).toBeNull();
		expect(findFirstMock).toHaveBeenCalledTimes(1);
	});

	it('does not fall back to the default org even when it has a row', async () => {
		let call = 0;
		findFirstMock.mockImplementation(async () => (call++ === 0 ? null : { value: DEFAULT_KC_ORG }));
		expect(await getKcOrgId('some-club')).toBeNull();
	});

	it('returns a UUID orgId itself when no row exists', async () => {
		findFirstMock.mockResolvedValue(null);
		expect(await getKcOrgId(UUID)).toBe(UUID);
	});
});

describe('keycloak admin path encoding', () => {
	const evil = '../x/y?z=1#h';
	const encoded = encodeURIComponent(evil);
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		fetchMock = vi.fn(async (url: string) =>
			url.endsWith('/token')
				? new Response(JSON.stringify({ access_token: 't', expires_in: 3600 }), { status: 200 })
				: new Response(JSON.stringify([]), { status: 200 })
		);
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => vi.unstubAllGlobals());

	function requestedUrls(): string[] {
		return fetchMock.mock.calls.map(([url]) => url as string).filter((u) => !u.endsWith('/token'));
	}

	it('encodes the org id in listOrgMembers', async () => {
		await listOrgMembers(evil);
		expect(requestedUrls()).toEqual([`https://kc.test/admin/realms/scoring/organizations/${encoded}/members?max=200`]);
	});

	it('encodes org and user ids in removeFromOrg', async () => {
		await removeFromOrg(evil, evil);
		expect(requestedUrls()).toEqual([
			`https://kc.test/admin/realms/scoring/organizations/${encoded}/members/${encoded}`
		]);
	});

	it('encodes the user id in deleteUser', async () => {
		await deleteUser(evil);
		expect(requestedUrls()).toEqual([`https://kc.test/admin/realms/scoring/users/${encoded}`]);
	});

	it('encodes the user id in assignAdminRole', async () => {
		fetchMock.mockImplementation(async (url: string) =>
			url.endsWith('/token')
				? new Response(JSON.stringify({ access_token: 't', expires_in: 3600 }), { status: 200 })
				: new Response(JSON.stringify({ id: 'r', name: 'admin' }), { status: 200 })
		);
		await assignAdminRole(evil);
		expect(requestedUrls()).toContain(
			`https://kc.test/admin/realms/scoring/users/${encoded}/role-mappings/realm`
		);
	});

	it('encodes the role name in listUsersWithRole', async () => {
		await listUsersWithRole(evil);
		expect(requestedUrls()).toEqual([`https://kc.test/admin/realms/scoring/roles/${encoded}/users`]);
	});

	it('encodes the user id in listKcOrgIdsForUser', async () => {
		await listKcOrgIdsForUser(evil);
		expect(requestedUrls()).toEqual([`https://kc.test/admin/realms/scoring/users/${encoded}/organizations`]);
	});
});

describe('listKcOrgIdsForUser', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('returns the ids of all organizations the user belongs to', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) =>
				url.endsWith('/token')
					? new Response(JSON.stringify({ access_token: 't', expires_in: 3600 }), { status: 200 })
					: new Response(JSON.stringify([{ id: 'o1' }, { id: 'o2' }]), { status: 200 })
			)
		);
		expect(await listKcOrgIdsForUser(UUID)).toEqual(['o1', 'o2']);
	});
});

describe('inviteUserByEmail', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('returns null and does not add or create anything when the email exists', async () => {
		const fetchMock = vi.fn(async (url: string) =>
			url.endsWith('/token')
				? new Response(JSON.stringify({ access_token: 't', expires_in: 3600 }), { status: 200 })
				: new Response(JSON.stringify([{ id: UUID, email: 'taken@example.com', enabled: true }]), { status: 200 })
		);
		vi.stubGlobal('fetch', fetchMock);

		expect(await inviteUserByEmail('taken@example.com', DEFAULT_KC_ORG)).toBeNull();

		const calls = fetchMock.mock.calls as unknown as [string, RequestInit?][];
		const mutations = calls.filter(([url, init]) => !url.endsWith('/token') && init?.method && init.method !== 'GET');
		expect(mutations).toHaveLength(0);
	});

	it('reuses a leftover user without any organization and adds them to the org', async () => {
		const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
			if (url.endsWith('/token')) return new Response(JSON.stringify({ access_token: 't', expires_in: 3600 }), { status: 200 });
			if (url.includes('/users?email=')) return new Response(JSON.stringify([{ id: UUID, email: 'old@example.com', enabled: true }]), { status: 200 });
			if (url.endsWith(`/users/${UUID}/organizations`)) return new Response('[]', { status: 200 });
			return new Response(init?.method === 'GET' || !init?.method ? '[]' : null, { status: 204 });
		});
		vi.stubGlobal('fetch', fetchMock);

		expect(await inviteUserByEmail('old@example.com', DEFAULT_KC_ORG)).toBe(UUID);

		const calls = fetchMock.mock.calls as unknown as [string, RequestInit?][];
		expect(calls.some(([url, init]) => url.endsWith(`/organizations/${DEFAULT_KC_ORG}/members`) && init?.method === 'POST')).toBe(true);
		expect(calls.some(([url, init]) => url.endsWith('/users') && init?.method === 'POST')).toBe(false);
	});
});

describe('listKcOrgIdsForUser fallback', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('scans org members with the service account when the direct lookup is not allowed', async () => {
		const OTHER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
		vi.stubGlobal('fetch', vi.fn(async (url: string) => {
			if (url.endsWith('/token')) return new Response(JSON.stringify({ access_token: 't', expires_in: 3600 }), { status: 200 });
			if (url.endsWith(`/users/${UUID}/organizations`)) return new Response(null, { status: 403 });
			if (url.endsWith('/organizations?max=200')) return new Response(JSON.stringify([{ id: DEFAULT_KC_ORG }, { id: OTHER }]), { status: 200 });
			if (url.includes(`/organizations/${OTHER}/members`)) return new Response(JSON.stringify([{ id: UUID }]), { status: 200 });
			return new Response('[]', { status: 200 });
		}));

		expect(await listKcOrgIdsForUser(UUID)).toEqual([OTHER]);
	});
});
