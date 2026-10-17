import { describe, it, expect, vi, beforeEach } from 'vitest';

const kc = vi.hoisted(() => ({
	getKcOrgId: vi.fn(),
	listOrgMembers: vi.fn(),
	resendInvite: vi.fn()
}));

vi.mock('$lib/server/keycloak-admin.js', () => kc);

const { POST } = await import('./+server.js');

const KC_ORG = '11111111-1111-4111-8111-111111111111';
const MEMBER_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_ID = '33333333-3333-4333-8333-333333333333';

function event(id: string) {
	return {
		params: { id },
		locals: { isAdmin: true, orgId: 'org-a' }
	} as unknown as Parameters<typeof POST>[0];
}

describe('POST /api/users/[id]/resend', () => {
	beforeEach(() => {
		Object.values(kc).forEach((fn) => fn.mockReset());
		kc.getKcOrgId.mockResolvedValue(KC_ORG);
		kc.listOrgMembers.mockResolvedValue([{ id: MEMBER_ID, email: 'member@example.com', enabled: true }]);
	});

	it('returns 404 and sends nothing for a user outside the org', async () => {
		const res = await POST(event(OTHER_ID));
		expect(res.status).toBe(404);
		expect(await res.json()).toEqual({ error: 'Nutzer nicht gefunden' });
		expect(kc.resendInvite).not.toHaveBeenCalled();
	});

	it('returns 400 for a non UUID id without touching Keycloak', async () => {
		const res = await POST(event('../foo'));
		expect(res.status).toBe(400);
		expect(kc.listOrgMembers).not.toHaveBeenCalled();
		expect(kc.resendInvite).not.toHaveBeenCalled();
	});

	it('resends the invite for an org member', async () => {
		const res = await POST(event(MEMBER_ID));
		expect(res.status).toBe(200);
		expect(kc.resendInvite).toHaveBeenCalledWith(MEMBER_ID, KC_ORG);
	});
});
