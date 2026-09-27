import { db } from '$lib/server/db/index.js';
import { settings } from '$lib/server/db/schema.js';
import { loadMatchOverlayData } from '$lib/server/overlay-data.js';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types.js';

const EMPTY = {
	match: null,
	matchId: null,
	timeouts: { home: 0, guest: 0 },
	customCode: null,
	templateId: null,
	scoreboardLayout: null,
	scoreboardOptions: null
};

export const load: PageServerLoad = async ({ params }) => {
	const slugRow = await db.query.settings.findFirst({
		where: and(eq(settings.key, 'overlaySlug'), eq(settings.value, params.slug))
	});

	if (!slugRow) return EMPTY;

	const orgId = slugRow.orgId;

	const permalinkRow = await db.query.settings.findFirst({
		where: and(eq(settings.orgId, orgId), eq(settings.key, 'permalinkOverlayMatchId'))
	});

	if (!permalinkRow?.value) return EMPTY;

	const matchId = parseInt(permalinkRow.value);
	if (isNaN(matchId)) return EMPTY;

	return { ...(await loadMatchOverlayData(matchId)), matchId };
};
