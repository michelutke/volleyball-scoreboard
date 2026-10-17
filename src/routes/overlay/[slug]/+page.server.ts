import { db } from '$lib/server/db/index.js';
import { settings, matches } from '$lib/server/db/schema.js';
import { loadMatchOverlayData } from '$lib/server/overlay-data.js';
import { eq, and, asc } from 'drizzle-orm';
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
		where: and(eq(settings.key, 'overlaySlug'), eq(settings.value, params.slug)),
		orderBy: asc(settings.orgId)
	});

	if (!slugRow) return EMPTY;

	const orgId = slugRow.orgId;

	const permalinkRow = await db.query.settings.findFirst({
		where: and(eq(settings.orgId, orgId), eq(settings.key, 'permalinkOverlayMatchId'))
	});

	if (!permalinkRow?.value) return EMPTY;

	const matchId = parseInt(permalinkRow.value);
	if (isNaN(matchId)) return EMPTY;

	const ownedMatch = await db.query.matches.findFirst({
		where: and(eq(matches.id, matchId), eq(matches.orgId, orgId))
	});
	if (!ownedMatch) return EMPTY;

	return { ...(await loadMatchOverlayData(matchId)), matchId };
};
