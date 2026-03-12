import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { matches, scores } from '$lib/server/db/schema.js';
import { matchSSEEmitter } from '$lib/server/sse.js';
import { toMatchState } from '$lib/server/match-state.js';
import { getDefaultTemplate, templateToMatchColors } from '$lib/server/design-template.js';
import { and, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ params, locals }) => {
	const { orgId } = locals;
	const matchId = parseInt(params.matchId);

	const match = await db.query.matches.findFirst({
		where: and(eq(matches.orgId, orgId), eq(matches.id, matchId))
	});
	if (!match) return json({ error: 'Match not found' }, { status: 404 });

	// Apply default template if match has no template assigned
	const updateData: Record<string, unknown> = { status: 'live', updatedAt: new Date() };
	if (!match.designTemplateId) {
		const defaultTemplate = await getDefaultTemplate(orgId);
		if (defaultTemplate) {
			Object.assign(updateData, templateToMatchColors(defaultTemplate));
		}
	}

	// Set status to live (and apply template colors if needed)
	const [updated] = await db
		.update(matches)
		.set(updateData)
		.where(eq(matches.id, matchId))
		.returning();

	// Create initial score record if none exists
	let score = await db.query.scores.findFirst({
		where: eq(scores.matchId, matchId)
	});

	if (!score) {
		const [newScore] = await db
			.insert(scores)
			.values({ matchId })
			.returning();
		score = newScore;
	}

	const state = toMatchState(updated, score);
	matchSSEEmitter.emit(matchId, { type: 'match', data: state });

	return json(state);
};
