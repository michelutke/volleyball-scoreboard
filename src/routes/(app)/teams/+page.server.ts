import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { settings, teams } from '$lib/server/db/schema.js';
import { syncTeams } from '$lib/server/sync.js';
import { shouldSync } from '$lib/server/sync-throttle.js';
import { and, eq, asc } from 'drizzle-orm';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals, setHeaders }) => {
	const { orgId } = locals;
	const clubNameSetting = await db.query.settings.findFirst({
		where: and(eq(settings.orgId, orgId), eq(settings.key, 'clubName'))
	});

	if (!clubNameSetting) {
		redirect(302, '/settings?setup=true');
	}

	if (shouldSync(`teams:${orgId}`)) syncTeams(orgId).catch(() => {});

	const [allTeams, pinnedRow] = await Promise.all([
		db.select().from(teams).where(eq(teams.orgId, orgId)).orderBy(asc(teams.name)),
		db.query.settings.findFirst({
			where: and(eq(settings.orgId, orgId), eq(settings.key, 'pinnedTeams'))
		})
	]);

	const pinnedTeamIds: number[] = pinnedRow ? JSON.parse(pinnedRow.value) : [];

	setHeaders({ 'cache-control': 'private, max-age=60' });

	return {
		teams: allTeams.map((t) => ({
			id: t.id,
			name: t.name,
			swissVolleyTeamId: t.swissVolleyTeamId
		})),
		clubName: clubNameSetting.value,
		pinnedTeamIds
	};
};
