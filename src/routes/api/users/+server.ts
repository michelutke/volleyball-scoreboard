import { json } from '@sveltejs/kit';
import { listOrgMembersWithStatus, listUsersWithRole, inviteUserByEmail, getKcOrgId } from '$lib/server/keycloak-admin.js';
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

	const body: { email?: string } = await request.json();
	if (!body.email?.trim()) return json({ error: 'E-Mail erforderlich' }, { status: 400 });

	const allMembers = await listOrgMembersWithStatus(kcOrgId);
	if (allMembers.length >= 5) {
		return json({ error: 'Maximale Anzahl Nutzer erreicht' }, { status: 400 });
	}

	try {
		const userId = await inviteUserByEmail(body.email.trim(), kcOrgId);
		return json({ id: userId, email: body.email.trim(), emailSent: true }, { status: 201 });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Einladung fehlgeschlagen';
		const isAlreadyMember = msg.toLowerCase().includes('conflict') || msg.includes('409');
		return json(
			{ error: isAlreadyMember ? 'Nutzer ist bereits Mitglied dieser Organisation' : msg },
			{ status: isAlreadyMember ? 400 : 500 }
		);
	}
};
