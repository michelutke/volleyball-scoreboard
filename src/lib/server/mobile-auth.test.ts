import { describe, it, expect } from 'vitest';
import { extractOrgId } from './mobile-auth';

const UUID = '5f1c1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a5b';

describe('extractOrgId', () => {
	it('reads direct org_id claim', () => {
		expect(extractOrgId({ org_id: UUID })).toBe(UUID);
	});

	it('reads organization object claim { alias: { id } }', () => {
		expect(extractOrgId({ organization: { myclub: { id: UUID } } })).toBe(UUID);
	});

	it('reads organizations array claim with object element', () => {
		expect(extractOrgId({ organizations: ['myclub', { myclub: { id: UUID } }] })).toBe(UUID);
	});

	it('returns null when no org claim present', () => {
		expect(extractOrgId({ sub: 'user-1' })).toBeNull();
	});

	it('returns null for malformed organization claim', () => {
		expect(extractOrgId({ organization: 'not-an-object' })).toBeNull();
	});
});
