import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { settings } from '$lib/server/db/schema.js';
import { and, eq } from 'drizzle-orm';
import { listOrgMembersWithStatus, listUsersWithRole } from '$lib/server/keycloak-admin.js';
import type { PageServerLoad } from './$types.js';

type ActiveUserRow = { id: string; email: string; enabled: boolean; isAdmin: boolean };
type PendingInviteRow = { id: string; email: string };

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.isAdmin) redirect(303, '/teams');

	const row = await db.query.settings.findFirst({
		where: and(eq(settings.orgId, locals.orgId), eq(settings.key, 'kcOrgId'))
	});
	let kcOrgId = row?.value;

	// fallback: try 'default' org (single-tenant self-hosted with stale session)
	if (!kcOrgId && locals.orgId !== 'default') {
		const fallback = await db.query.settings.findFirst({
			where: and(eq(settings.orgId, 'default'), eq(settings.key, 'kcOrgId'))
		});
		kcOrgId = fallback?.value;
	}

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
