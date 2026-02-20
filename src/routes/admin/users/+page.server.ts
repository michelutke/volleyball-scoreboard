import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { settings } from '$lib/server/db/schema.js';
import { and, eq } from 'drizzle-orm';
import { listOrgMembers } from '$lib/server/keycloak-admin.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.isAdmin) redirect(303, '/');

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

	if (!kcOrgId) return { users: [], kcOrgIdMissing: true };

	try {
		const members = await listOrgMembers(kcOrgId);
		return {
			users: members.map((u) => ({ id: u.id, email: u.email, enabled: u.enabled })),
			kcOrgIdMissing: false
		};
	} catch (err) {
		console.error('listOrgMembers failed:', err);
		return { users: [], kcOrgIdMissing: false, listError: String(err) };
	}
};
