import { describe, it, expect } from 'vitest';
import { isPublicPath } from './public-paths';

describe('isPublicPath', () => {
	it('matches the root only exactly', () => {
		expect(isPublicPath('/')).toBe(true);
		expect(isPublicPath('/dashboard')).toBe(false);
	});

	it('matches a public path and its children', () => {
		expect(isPublicPath('/auth')).toBe(true);
		expect(isPublicPath('/auth/callback/keycloak')).toBe(true);
		expect(isPublicPath('/library')).toBe(true);
		expect(isPublicPath('/api/overlay-sandbox/123')).toBe(true);
		expect(isPublicPath('/api/overlay-sandbox/preview')).toBe(true);
		expect(isPublicPath('/api/billing/webhook')).toBe(true);
		expect(isPublicPath('/api/auth/auto-login')).toBe(true);
	});

	it('does not match paths that merely share a prefix', () => {
		expect(isPublicPath('/authx')).toBe(false);
		expect(isPublicPath('/library-admin')).toBe(false);
		expect(isPublicPath('/signin-admin')).toBe(false);
		expect(isPublicPath('/api/healthz')).toBe(false);
		expect(isPublicPath('/api/billing/webhook-evil')).toBe(false);
	});
});
