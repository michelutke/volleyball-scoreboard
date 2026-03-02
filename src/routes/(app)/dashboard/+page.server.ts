import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { settings } from '$lib/server/db/schema.js';
import { and, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals }) => {
	const { orgId } = locals;
	const clubNameRow = await db.query.settings.findFirst({
		where: and(eq(settings.orgId, orgId), eq(settings.key, 'clubName'))
	});
	if (!clubNameRow) redirect(302, '/settings?setup=true');

	const pinnedRow = await db.query.settings.findFirst({
		where: and(eq(settings.orgId, orgId), eq(settings.key, 'pinnedTeams'))
	});
	const pinnedTeamIds: number[] = pinnedRow ? JSON.parse(pinnedRow.value) : [];
	return { pinnedTeamIds };
};
