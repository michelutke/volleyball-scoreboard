import { db } from '$lib/server/db/index.js';
import { settings } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types.js';

export const load: LayoutServerLoad = async () => {
	const row = await db.query.settings.findFirst({
		where: eq(settings.key, 'accentColor')
	});
	return { accentColor: row?.value ?? null };
};
