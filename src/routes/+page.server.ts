import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { settings } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ url }) => {
	const clubIdRow = await db.query.settings.findFirst({
		where: eq(settings.key, 'swissVolleyClubId')
	});
	const clubNameRow = await db.query.settings.findFirst({
		where: eq(settings.key, 'clubName')
	});

	const hasSettings = !!(clubIdRow || clubNameRow);

	if (hasSettings && !url.searchParams.has('edit')) {
		redirect(302, '/teams');
	}

	return {
		clubName: clubNameRow?.value ?? '',
		swissVolleyClubId: clubIdRow?.value ?? ''
	};
};
