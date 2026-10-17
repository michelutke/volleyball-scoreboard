import { describe, it, expect, vi, beforeEach } from 'vitest';

const kc = vi.hoisted(() => ({
	getKcOrgId: vi.fn(),
	listOrgMembers: vi.fn(),
	listKcOrgIdsForUser: vi.fn(),
	removeFromOrg: vi.fn(),
	deleteUser: vi.fn(),
	assignAdminRole: vi.fn(),
	revokeAdminRole: vi.fn()
}));

vi.mock('$lib/server/keycloak-admin.js', () => kc);

const { DELETE, PATCH } = await import('./+server.js');

const KC_ORG = '11111111-1111-4111-8111-111111111111';
const MEMBER_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_ID = '33333333-3333-4333-8333-333333333333';
const SELF_ID = '44444444-4444-4444-8444-444444444444';

function event(id: string, body?: unknown) {
	return {
		params: { id },
		locals: { isAdmin: true, orgId: 'org-a', session: { user: { email: 'me@example.com' } } },
		request: new Request('http://localhost/api/users/x', {
			method: 'PATCH',
			body: JSON.stringify(body ?? {})
		})
	} as unknown as Parameters<typeof DELETE>[0];
}

function expectNoMutation() {
	expect(kc.removeFromOrg).not.toHaveBeenCalled();
	expect(kc.deleteUser).not.toHaveBeenCalled();
	expect(kc.assignAdminRole).not.toHaveBeenCalled();
	expect(kc.revokeAdminRole).not.toHaveBeenCalled();
}

describe('/api/users/[id]', () => {
	beforeEach(() => {
		Object.values(kc).forEach((fn) => fn.mockReset());
		kc.getKcOrgId.mockResolvedValue(KC_ORG);
		kc.listOrgMembers.mockResolvedValue([
			{ id: MEMBER_ID, email: 'member@example.com', enabled: true },
			{ id: SELF_ID, email: 'me@example.com', enabled: true }
		]);
	});

	describe('DELETE', () => {
		it('returns 404 and mutates nothing for a user outside the org', async () => {
			const res = await DELETE(event(OTHER_ID));
			expect(res.status).toBe(404);
			expect(await res.json()).toEqual({ error: 'Nutzer nicht gefunden' });
			expectNoMutation();
		});

		it('returns 400 for a non UUID id without touching Keycloak', async () => {
			const res = await DELETE(event('../foo'));
			expect(res.status).toBe(400);
			expect(kc.getKcOrgId).not.toHaveBeenCalled();
			expect(kc.listOrgMembers).not.toHaveBeenCalled();
			expectNoMutation();
		});

		it('refuses to remove the own account', async () => {
			const res = await DELETE(event(SELF_ID));
			expect(res.status).toBe(400);
			expectNoMutation();
		});

		it('only removes from the org when the user belongs to another org', async () => {
			kc.listKcOrgIdsForUser.mockResolvedValue(['99999999-9999-4999-8999-999999999999']);
			const res = await DELETE(event(MEMBER_ID));
			expect(res.status).toBe(200);
			expect(kc.removeFromOrg).toHaveBeenCalledWith(MEMBER_ID, KC_ORG);
			expect(kc.deleteUser).not.toHaveBeenCalled();
		});

		it('deletes the Keycloak user when no other org remains', async () => {
			kc.listKcOrgIdsForUser.mockResolvedValue([]);
			const res = await DELETE(event(MEMBER_ID));
			expect(res.status).toBe(200);
			expect(kc.removeFromOrg).toHaveBeenCalledWith(MEMBER_ID, KC_ORG);
			expect(kc.deleteUser).toHaveBeenCalledWith(MEMBER_ID);
		});

		it('does not delete the Keycloak user when the org lookup fails', async () => {
			kc.listKcOrgIdsForUser.mockResolvedValue(null);
			const res = await DELETE(event(MEMBER_ID));
			expect(res.status).toBe(200);
			expect(kc.removeFromOrg).toHaveBeenCalledWith(MEMBER_ID, KC_ORG);
			expect(kc.deleteUser).not.toHaveBeenCalled();
		});
	});

	describe('PATCH', () => {
		it('returns 404 and mutates nothing for a user outside the org', async () => {
			const res = await PATCH(event(OTHER_ID, { isAdmin: true }));
			expect(res.status).toBe(404);
			expectNoMutation();
		});

		it('returns 400 for a non UUID id without touching Keycloak', async () => {
			const res = await PATCH(event('../foo', { isAdmin: true }));
			expect(res.status).toBe(400);
			expect(kc.listOrgMembers).not.toHaveBeenCalled();
			expectNoMutation();
		});

		it('assigns the admin role to an org member', async () => {
			const res = await PATCH(event(MEMBER_ID, { isAdmin: true }));
			expect(res.status).toBe(200);
			expect(kc.assignAdminRole).toHaveBeenCalledWith(MEMBER_ID);
		});

		it('revokes the admin role from an org member', async () => {
			const res = await PATCH(event(MEMBER_ID, { isAdmin: false }));
			expect(res.status).toBe(200);
			expect(kc.revokeAdminRole).toHaveBeenCalledWith(MEMBER_ID);
		});
	});
});
