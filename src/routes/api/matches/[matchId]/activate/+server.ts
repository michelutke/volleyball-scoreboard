import { json } from '@sveltejs/kit';
import { startMatch } from '$lib/server/match-service';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ params, locals }) => {
	const started = await startMatch(locals.orgId, parseInt(params.matchId));
	if (!started) return json({ error: 'Match not found' }, { status: 404 });
	return json(started.state);
};
