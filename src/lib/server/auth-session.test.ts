import { describe, it, expect, vi } from 'vitest';
import type { Cookies } from '@sveltejs/kit';

vi.mock('$lib/server/keycloak-admin', () => ({
	getKcOrgIdFromAlias: vi.fn(),
	getKcOrgIdForUser: vi.fn(),
	getKcOrgIdByScanningMembers: vi.fn()
}));

const { clearAuthCookies } = await import('./auth-session');

function fakeCookies(names: string[]) {
	const deleted: { name: string; path?: string }[] = [];
	const cookies = {
		getAll: () => names.map((name) => ({ name, value: 'x' })),
		delete: (name: string, opts?: { path?: string }) => deleted.push({ name, path: opts?.path })
	} as unknown as Cookies;
	return { cookies, deleted };
}

describe('clearAuthCookies', () => {
	it('deletes plain, prefixed and chunked auth cookies', () => {
		const names = [
			'authjs.session-token',
			'authjs.session-token.0',
			'authjs.session-token.1',
			'__Secure-authjs.session-token.0',
			'__Secure-authjs.session-token.1',
			'__Host-authjs.csrf-token',
			'authjs.callback-url',
			'__Secure-authjs.callback-url'
		];
		const { cookies, deleted } = fakeCookies(names);
		clearAuthCookies(cookies);
		expect(deleted.map((d) => d.name).sort()).toEqual([...names].sort());
		expect(deleted.every((d) => d.path === '/')).toBe(true);
	});

	it('leaves unrelated cookies alone', () => {
		const { cookies, deleted } = fakeCookies([
			'scoring-theme',
			'scoring-motion',
			'authjs.session-tokenX',
			'other.authjs.session-token'
		]);
		clearAuthCookies(cookies);
		expect(deleted).toEqual([]);
	});
});
