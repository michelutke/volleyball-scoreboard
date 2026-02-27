import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { settings } from '$lib/server/db/schema.js';
import { and, eq } from 'drizzle-orm';
import { listOrgMembers, listUsersWithRole } from '$lib/server/keycloak-admin.js';
import type { PageServerLoad } from './$types.js';

type UserRow = { id: string; email: string; enabled: boolean; isAdmin: boolean };

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

	if (!kcOrgId) return { users: [] as UserRow[], kcOrgIdMissing: true };

	try {
		const [members, adminUsers] = await Promise.all([
			listOrgMembers(kcOrgId),
			listUsersWithRole('admin')
		]);
		const adminIds = new Set(adminUsers.map((u) => u.id));
		return {
			users: members.map((u) => ({ id: u.id, email: u.email, enabled: u.enabled, isAdmin: adminIds.has(u.id) })),
			kcOrgIdMissing: false
		};
	} catch (err) {
		console.error('listOrgMembers failed:', err);
		return { users: [] as UserRow[], kcOrgIdMissing: false, listError: String(err) };
	}
};
