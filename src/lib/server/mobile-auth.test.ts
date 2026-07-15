import { describe, it, expect } from 'vitest';
import { extractOrgId, validateMobilePayload } from './mobile-auth';

const UUID = '5f1c1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a5b';
const MOBILE_CLIENT_ID = 'scorely-mobile';

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

describe('validateMobilePayload', () => {
	it('returns orgId when azp matches the mobile client id', () => {
		expect(validateMobilePayload({ azp: MOBILE_CLIENT_ID, org_id: UUID })).toBe(UUID);
	});

	it('returns null when azp is a different client', () => {
		expect(validateMobilePayload({ azp: 'some-other-client', org_id: UUID })).toBeNull();
	});

	it('returns null when azp is absent', () => {
		expect(validateMobilePayload({ org_id: UUID })).toBeNull();
	});
});
