import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { designTemplates, settings } from '$lib/server/db/schema.js';
import { and, eq, isNotNull } from 'drizzle-orm';
import type { LibraryOverlay } from '$lib/types.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.isAdmin) redirect(303, '/teams');

	const [templates, libraryRows] = await Promise.all([
		db.query.designTemplates.findMany({
			where: eq(designTemplates.orgId, locals.orgId),
			orderBy: designTemplates.createdAt
		}),
		db
			.select({
				id: designTemplates.id,
				name: designTemplates.name,
				description: designTemplates.description,
				overlayBg: designTemplates.overlayBg,
				overlayBg2: designTemplates.overlayBg2,
				overlayBgGradient: designTemplates.overlayBgGradient,
				overlayText: designTemplates.overlayText,
				clubName: settings.value
			})
			.from(designTemplates)
			.leftJoin(
				settings,
				and(eq(settings.orgId, designTemplates.orgId), eq(settings.key, 'clubName'))
			)
			.where(and(eq(designTemplates.isPublic, true), isNotNull(designTemplates.customCode)))
			.orderBy(designTemplates.createdAt)
	]);

	const library: LibraryOverlay[] = libraryRows.map((r) => ({
		id: r.id,
		name: r.name,
		description: r.description,
		clubName: r.clubName ?? 'Unbekannt',
		overlayBg: r.overlayBg,
		overlayBg2: r.overlayBg2,
		overlayBgGradient: r.overlayBgGradient,
		overlayText: r.overlayText
	}));

	return { templates, library };
};
