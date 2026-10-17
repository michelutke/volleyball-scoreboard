import { db } from '$lib/server/db/index.js';
import { settings } from '$lib/server/db/schema.js';
import { and, eq } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types.js';

export const load: LayoutServerLoad = async ({ locals, depends, cookies }) => {
	depends('app:settings');
	const theme = cookies.get('scoring-theme') ?? null;
	const motion = cookies.get('scoring-motion') ?? null;

	const orgId = locals.orgId;
	if (!orgId) return { accentColor: null, isAdmin: false, session: null, theme, motion };

	const row = await db.query.settings.findFirst({
		where: and(eq(settings.orgId, orgId), eq(settings.key, 'accentColor'))
	});
	return {
		accentColor: row?.value ?? null,
		isAdmin: locals.isAdmin ?? false,
		session: locals.session ?? null,
		theme,
		motion
	};
};
