import { redirect } from '@sveltejs/kit';
import { getKcOrgId, listOrgMembersWithStatus, listUsersWithRole } from '$lib/server/keycloak-admin.js';
import type { PageServerLoad } from './$types.js';

type ActiveUserRow = { id: string; email: string; enabled: boolean; isAdmin: boolean };
type PendingInviteRow = { id: string; email: string };

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.isAdmin) redirect(303, '/teams');

	const kcOrgId = await getKcOrgId(locals.orgId);

	if (!kcOrgId) {
		return {
			activeUsers: [] as ActiveUserRow[],
			pendingInvites: [] as PendingInviteRow[],
			kcOrgIdMissing: true
		};
	}

	try {
		const [members, adminUsers] = await Promise.all([
			listOrgMembersWithStatus(kcOrgId),
			listUsersWithRole('admin')
		]);
		const adminIds = new Set(adminUsers.map((u: { id: string }) => u.id));

		const activeUsers: ActiveUserRow[] = members
			.filter((m) => m.emailVerified)
			.map((m) => ({ id: m.id, email: m.email, enabled: m.enabled, isAdmin: adminIds.has(m.id) }));

		const pendingInvites: PendingInviteRow[] = members
			.filter((m) => !m.emailVerified)
			.map((m) => ({ id: m.id, email: m.email }));

		return { activeUsers, pendingInvites, kcOrgIdMissing: false };
	} catch (err) {
		console.error('listOrgMembersWithStatus failed:', err);
		return {
			activeUsers: [] as ActiveUserRow[],
			pendingInvites: [] as PendingInviteRow[],
			kcOrgIdMissing: false,
			listError: String(err)
		};
	}
};
