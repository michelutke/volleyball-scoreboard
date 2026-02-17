import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db/index.js';
import { settings } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { getTeams } from '$lib/server/swiss-volley.js';
import { syncTeams } from '$lib/server/sync.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ url }) => {
	const clubNameSetting = await db.query.settings.findFirst({
		where: eq(settings.key, 'clubName')
	});

	if (clubNameSetting) {
		if (url.searchParams.get('edit') !== 'true') {
			redirect(302, '/teams');
		}
		return { clubName: clubNameSetting.value };
	}

	// No clubName yet — try auto-setup from Swiss Volley API
	if (env.SWISS_VOLLEY_API_KEY) {
		try {
			const svTeams = await getTeams();
			if (svTeams.length > 0) {
				const clubName = svTeams[0].club.clubCaption;
				await db
					.insert(settings)
					.values({ key: 'clubName', value: clubName })
					.onConflictDoUpdate({ target: settings.key, set: { value: clubName } });
				await syncTeams();
				redirect(302, '/teams');
			}
		} catch (e) {
			// If it's a redirect, rethrow
			if (e instanceof Response || (e && typeof e === 'object' && 'status' in e)) throw e;
			// API failure — fall through to manual form
		}
	}

	return {};
};
