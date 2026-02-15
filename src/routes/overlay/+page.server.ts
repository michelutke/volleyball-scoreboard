import { db } from '$lib/server/db/index.js';
import { matches, scores } from '$lib/server/db/schema.js';
import { toMatchState } from '$lib/server/match-state.js';
import { eq, desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async () => {
	const liveMatch = await db.query.matches.findFirst({
		where: eq(matches.status, 'live'),
		orderBy: desc(matches.createdAt)
	});

	if (!liveMatch) return { match: null };

	const score = await db.query.scores.findFirst({
		where: eq(scores.matchId, liveMatch.id),
		orderBy: desc(scores.createdAt)
	});

	if (!score) return { match: null };

	return { match: toMatchState(liveMatch, score) };
};
