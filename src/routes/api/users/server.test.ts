import { describe, it, expect, vi, beforeEach } from 'vitest';

const kc = vi.hoisted(() => ({
	getKcOrgId: vi.fn(),
	listOrgMembersWithStatus: vi.fn(),
	listUsersWithRole: vi.fn(),
	inviteUserByEmail: vi.fn(),
	addToOrg: vi.fn()
}));

vi.mock('$lib/server/keycloak-admin.js', () => kc);

const { POST } = await import('./+server.js');

const KC_ORG = '11111111-1111-4111-8111-111111111111';

function event(email: string) {
	return {
		locals: { isAdmin: true, orgId: 'org-a' },
		request: new Request('http://localhost/api/users', {
			method: 'POST',
			body: JSON.stringify({ email })
		})
	} as unknown as Parameters<typeof POST>[0];
}

describe('POST /api/users', () => {
	beforeEach(() => {
		Object.values(kc).forEach((fn) => fn.mockReset());
		kc.getKcOrgId.mockResolvedValue(KC_ORG);
		kc.listOrgMembersWithStatus.mockResolvedValue([]);
	});

	it('returns 409 without an id when the email is already registered', async () => {
		kc.inviteUserByEmail.mockResolvedValue(null);
		const res = await POST(event('taken@example.com'));
		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body).toEqual({ error: 'Diese E-Mail ist bereits registriert.' });
		expect(body.id).toBeUndefined();
		expect(kc.addToOrg).not.toHaveBeenCalled();
	});

	it('returns 201 with the new id for a fresh email', async () => {
		kc.inviteUserByEmail.mockResolvedValue('55555555-5555-4555-8555-555555555555');
		const res = await POST(event('new@example.com'));
		expect(res.status).toBe(201);
		expect((await res.json()).id).toBe('55555555-5555-4555-8555-555555555555');
	});

	it('keeps the 5 user limit', async () => {
		kc.listOrgMembersWithStatus.mockResolvedValue(new Array(5).fill({ id: 'x' }));
		const res = await POST(event('new@example.com'));
		expect(res.status).toBe(400);
		expect(kc.inviteUserByEmail).not.toHaveBeenCalled();
	});
});
