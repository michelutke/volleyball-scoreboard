import { json } from '@sveltejs/kit';
import { listOrgMembersWithStatus, listUsersWithRole, inviteUserByEmail, getKcOrgId } from '$lib/server/keycloak-admin.js';
import { userInviteSchema } from '$lib/server/validation.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.isAdmin) return json({ error: 'Forbidden' }, { status: 403 });

	const kcOrgId = await getKcOrgId(locals.orgId);
	if (!kcOrgId) return json([]);

	const [members, adminUsers] = await Promise.all([
		listOrgMembersWithStatus(kcOrgId),
		listUsersWithRole('admin')
	]);

	const adminIds = new Set(adminUsers.map((u) => u.id));
	return json(members.map((u) => ({
		id: u.id,
		email: u.email,
		enabled: u.enabled,
		isAdmin: adminIds.has(u.id)
	})));
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.isAdmin) return json({ error: 'Forbidden' }, { status: 403 });

	const kcOrgId = await getKcOrgId(locals.orgId);
	if (!kcOrgId) return json({ error: 'Organisation nicht konfiguriert' }, { status: 400 });

	const raw = await request.json();
	const parsed = userInviteSchema.safeParse(raw);
	if (!parsed.success) return json({ error: 'Invalid input' }, { status: 400 });
	const body = parsed.data;

	const allMembers = await listOrgMembersWithStatus(kcOrgId);
	if (allMembers.length >= 5) {
		return json({ error: 'Maximale Anzahl Nutzer erreicht' }, { status: 400 });
	}

	try {
		const userId = await inviteUserByEmail(body.email, kcOrgId);
		if (!userId) return json({ error: 'Diese E-Mail ist bereits registriert.' }, { status: 409 });
		return json({ id: userId, email: body.email, emailSent: true }, { status: 201 });
	} catch (err) {
		console.error('[users] invite failed:', err);
		return json({ error: 'Einladung fehlgeschlagen' }, { status: 500 });
	}
};
