import { describe, it, expect, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({
	env: {
		KEYCLOAK_ADMIN_URL: 'https://kc.test',
		KEYCLOAK_ADMIN_PASSWORD: 'secret',
		KEYCLOAK_REALM: 'scoring'
	}
}));

const { ensureRealmSettings } = await import('./keycloak-admin');

describe('ensureRealmSettings', () => {
	it('enables password reset on the realm so "Passwort vergessen?" works', async () => {
		const fetchMock = vi.fn(async (url: string, _init?: RequestInit) =>
			url.endsWith('/token')
				? new Response(JSON.stringify({ access_token: 't', expires_in: 60 }), { status: 200 })
				: new Response(null, { status: 204 })
		);
		vi.stubGlobal('fetch', fetchMock);

		await ensureRealmSettings();

		const put = fetchMock.mock.calls.find(([url]) => url === 'https://kc.test/admin/realms/scoring');
		expect(put).toBeDefined();
		const body = JSON.parse(put![1]!.body as string);
		expect(body.resetPasswordAllowed).toBe(true);
		expect(body.defaultLocale).toBe('de');
		vi.unstubAllGlobals();
	});
});
