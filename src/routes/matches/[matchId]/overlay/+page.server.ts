import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { matches } from '$lib/server/db/schema.js';
import { loadMatchOverlayData } from '$lib/server/overlay-data.js';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params }) => {
	const matchId = parseInt(params.matchId);

	const match = await db.query.matches.findFirst({
		where: eq(matches.id, matchId)
	});
	if (!match) error(404, 'Match not found');

	return loadMatchOverlayData(matchId);
};
