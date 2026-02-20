import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { settings } from '$lib/server/db/schema.js';
import { and, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ url, locals }) => {
	const orgId = locals.orgId;

	const clubNameSetting = await db.query.settings.findFirst({
		where: and(eq(settings.orgId, orgId), eq(settings.key, 'clubName'))
	});

	if (clubNameSetting) {
		if (url.searchParams.get('edit') !== 'true') {
			redirect(302, '/teams');
		}
		const accentSetting = await db.query.settings.findFirst({
			where: and(eq(settings.orgId, orgId), eq(settings.key, 'accentColor'))
		});
		const apiKeySetting = await db.query.settings.findFirst({
			where: and(eq(settings.orgId, orgId), eq(settings.key, 'swissVolleyApiKey'))
		});
		return {
			clubName: clubNameSetting.value,
			accentColor: accentSetting?.value ?? null,
			isAdmin: locals.isAdmin ?? false,
			swissVolleyApiKeySet: !!apiKeySetting
		};
	}

	return { isAdmin: locals.isAdmin ?? false, swissVolleyApiKeySet: false };
};
