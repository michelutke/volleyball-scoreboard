import { db } from '$lib/server/db/index.js';
import { designTemplates, settings } from '$lib/server/db/schema.js';
import { and, eq, isNotNull } from 'drizzle-orm';
import type { LibraryOverlay } from '$lib/types.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals }) => {
	const isLoggedIn = !!locals.orgId;
	const rows = await db
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
		.orderBy(designTemplates.createdAt);

	const overlays: LibraryOverlay[] = rows.map((r) => ({
		id: r.id,
		name: r.name,
		description: r.description,
		clubName: r.clubName ?? 'Unbekannt',
		overlayBg: r.overlayBg,
		overlayBg2: r.overlayBg2,
		overlayBgGradient: r.overlayBgGradient,
		overlayText: r.overlayText
	}));

	let orgLayoutId: string | null = null;
	let orgLayoutOptions: Record<string, unknown> | null = null;
	if (locals.orgId) {
		const orgSettings = await db.query.settings.findMany({
			where: eq(settings.orgId, locals.orgId)
		});
		const layoutRow = orgSettings.find((r) => r.key === 'defaultScoreboardLayout');
		const optsRow = orgSettings.find((r) => r.key === 'defaultScoreboardOptions');
		orgLayoutId = layoutRow?.value ?? null;
		if (optsRow?.value) {
			try {
				orgLayoutOptions = JSON.parse(optsRow.value);
			} catch {
				orgLayoutOptions = null;
			}
		}
	}

	return { overlays, isLoggedIn, orgLayoutId, orgLayoutOptions };
};
