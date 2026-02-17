import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { settings, teams } from '$lib/server/db/schema.js';
import { syncTeams } from '$lib/server/sync.js';
import { eq, asc } from 'drizzle-orm';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async () => {
	const clubNameSetting = await db.query.settings.findFirst({
		where: eq(settings.key, 'clubName')
	});

	if (!clubNameSetting) {
		redirect(302, '/');
	}

	try {
		await syncTeams();
	} catch {
		// Sync failure is non-fatal, show local data
	}

	const allTeams = await db.select().from(teams).orderBy(asc(teams.name));

	return {
		teams: allTeams.map((t) => ({
			id: t.id,
			name: t.name,
			swissVolleyTeamId: t.swissVolleyTeamId
		})),
		clubName: clubNameSetting.value
	};
};
