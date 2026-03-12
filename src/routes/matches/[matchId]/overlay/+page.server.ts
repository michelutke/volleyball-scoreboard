import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { designTemplates, matches, scores, timeouts } from '$lib/server/db/schema.js';
import { toMatchState } from '$lib/server/match-state.js';
import { eq, desc, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params }) => {
	const matchId = parseInt(params.matchId);

	const match = await db.query.matches.findFirst({
		where: eq(matches.id, matchId)
	});
	if (!match) error(404, 'Match not found');

	const score = await db.query.scores.findFirst({
		where: eq(scores.matchId, matchId),
		orderBy: desc(scores.createdAt)
	});

	if (!score) return { match: null, timeouts: { home: 0, guest: 0 }, customCode: null };

	const [homeTimeouts, guestTimeouts, template] = await Promise.all([
		db.query.timeouts.findMany({
			where: and(eq(timeouts.matchId, matchId), eq(timeouts.team, 'home'), eq(timeouts.set, score.currentSet))
		}),
		db.query.timeouts.findMany({
			where: and(eq(timeouts.matchId, matchId), eq(timeouts.team, 'guest'), eq(timeouts.set, score.currentSet))
		}),
		match.designTemplateId
			? db.query.designTemplates.findFirst({ where: eq(designTemplates.id, match.designTemplateId) })
			: Promise.resolve(null)
	]);

	return {
		match: toMatchState(match, score),
		timeouts: { home: homeTimeouts.length, guest: guestTimeouts.length },
		customCode: template?.customCode ?? null,
		templateId: match.designTemplateId ?? null
	};
};
