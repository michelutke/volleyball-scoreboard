import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { settings } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async () => {
	const clubId = await db.query.settings.findFirst({
		where: eq(settings.key, 'swissVolleyClubId')
	});
	const clubName = await db.query.settings.findFirst({
		where: eq(settings.key, 'clubName')
	});

	if (clubId || clubName) {
		redirect(302, '/teams');
	}

	return {};
};
