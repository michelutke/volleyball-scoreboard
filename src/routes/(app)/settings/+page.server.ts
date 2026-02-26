import { db } from '$lib/server/db/index.js';
import { settings } from '$lib/server/db/schema.js';
import { and, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals, url }) => {
	const orgId = locals.orgId;

	const clubNameSetting = await db.query.settings.findFirst({
		where: and(eq(settings.orgId, orgId), eq(settings.key, 'clubName'))
	});

	const isSetup = url.searchParams.get('setup') === 'true' || !clubNameSetting;

	if (clubNameSetting) {
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
			swissVolleyApiKeySet: !!apiKeySetting,
			isSetup
		};
	}

	return { isAdmin: locals.isAdmin ?? false, swissVolleyApiKeySet: false, isSetup: true };
};
