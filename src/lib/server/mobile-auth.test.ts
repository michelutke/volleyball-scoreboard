import { describe, it, expect, vi, beforeEach } from 'vitest';

const getKcOrgIdFromAliasMock = vi.hoisted(() => vi.fn());
const getKcOrgIdForUserMock = vi.hoisted(() => vi.fn());
const getKcOrgIdByScanningMembersMock = vi.hoisted(() => vi.fn());
vi.mock('$lib/server/keycloak-admin', () => ({
	getKcOrgIdFromAlias: getKcOrgIdFromAliasMock,
	getKcOrgIdForUser: getKcOrgIdForUserMock,
	getKcOrgIdByScanningMembers: getKcOrgIdByScanningMembersMock
}));

const { extractOrgId, extractOrgAlias, validateMobilePayload, resolveMobileOrgId } =
	await import('./mobile-auth');

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

describe('extractOrgAlias', () => {
	it('reads alias from array claim without ids (mapper without addOrganizationId)', () => {
		expect(extractOrgAlias({ organization: ['miggi-s-club'] })).toBe('miggi-s-club');
	});

	it('reads alias from object claim key', () => {
		expect(extractOrgAlias({ organization: { myclub: {} } })).toBe('myclub');
	});

	it('returns null when no org claim present', () => {
		expect(extractOrgAlias({ sub: 'user-1' })).toBeNull();
	});
});

describe('resolveMobileOrgId', () => {
	beforeEach(() => {
		getKcOrgIdFromAliasMock.mockReset();
		getKcOrgIdForUserMock.mockReset();
		getKcOrgIdByScanningMembersMock.mockReset();
		getKcOrgIdFromAliasMock.mockResolvedValue(undefined);
		getKcOrgIdForUserMock.mockResolvedValue(undefined);
		getKcOrgIdByScanningMembersMock.mockResolvedValue(undefined);
	});

	it('returns id from claim without calling Keycloak', async () => {
		expect(await resolveMobileOrgId({ azp: MOBILE_CLIENT_ID, org_id: UUID })).toBe(UUID);
		expect(getKcOrgIdFromAliasMock).not.toHaveBeenCalled();
	});

	it('resolves alias-only claim via Keycloak admin lookup', async () => {
		getKcOrgIdFromAliasMock.mockResolvedValue(UUID);
		expect(await resolveMobileOrgId({ azp: MOBILE_CLIENT_ID, organization: ['miggi-s-club'] })).toBe(UUID);
		expect(getKcOrgIdFromAliasMock).toHaveBeenCalledWith('miggi-s-club');
	});

	it('falls back to user organizations lookup when alias search misses', async () => {
		getKcOrgIdForUserMock.mockResolvedValue(UUID);
		expect(
			await resolveMobileOrgId({ azp: MOBILE_CLIENT_ID, sub: 'user-a', organization: ['miggi-s-club'] })
		).toBe(UUID);
		expect(getKcOrgIdForUserMock).toHaveBeenCalledWith('user-a');
	});

	it('falls back to scanning org members when user lookup misses', async () => {
		getKcOrgIdForUserMock.mockRejectedValue(new Error('403'));
		getKcOrgIdByScanningMembersMock.mockResolvedValue(UUID);
		expect(
			await resolveMobileOrgId({ azp: MOBILE_CLIENT_ID, sub: 'user-b', organization: ['miggi-s-club'] })
		).toBe(UUID);
		expect(getKcOrgIdByScanningMembersMock).toHaveBeenCalledWith('user-b');
	});

	it('caches a resolved org per user so later calls skip the admin API', async () => {
		getKcOrgIdForUserMock.mockResolvedValue(UUID);
		const payload = { azp: MOBILE_CLIENT_ID, sub: 'user-c', organization: ['miggi-s-club'] };
		expect(await resolveMobileOrgId(payload)).toBe(UUID);
		expect(await resolveMobileOrgId(payload)).toBe(UUID);
		expect(getKcOrgIdForUserMock).toHaveBeenCalledTimes(1);
	});

	it('returns null when every lookup finds nothing', async () => {
		expect(
			await resolveMobileOrgId({ azp: MOBILE_CLIENT_ID, sub: 'user-d', organization: ['ghost'] })
		).toBeNull();
	});

	it('does not look up alias when azp mismatches', async () => {
		expect(await resolveMobileOrgId({ azp: 'other', organization: ['miggi-s-club'] })).toBeNull();
		expect(getKcOrgIdFromAliasMock).not.toHaveBeenCalled();
	});
});
