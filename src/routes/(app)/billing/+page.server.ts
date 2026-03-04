import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { settings } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	const rows = await db
		.select()
		.from(settings)
		.where(and(eq(settings.orgId, locals.orgId), eq(settings.key, 'subscriptionStatus')));

	const subscriptionStatus = rows[0]?.value ?? null;
	return { subscriptionStatus };
};
