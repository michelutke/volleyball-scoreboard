import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { designTemplates } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.isAdmin) redirect(303, '/teams');

	const templates = await db.query.designTemplates.findMany({
		where: eq(designTemplates.orgId, locals.orgId),
		orderBy: designTemplates.createdAt
	});

	return { templates };
};
