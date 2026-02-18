import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { teams } from '$lib/server/db/schema.js';
import { syncMatches } from '$lib/server/sync.js';
import { and, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ params, locals }) => {
	const { orgId } = locals;
	const teamId = parseInt(params.teamId);

	const team = await db.query.teams.findFirst({
		where: and(eq(teams.orgId, orgId), eq(teams.id, teamId))
	});
	if (!team) return json({ error: 'Team not found' }, { status: 404 });
	if (!team.swissVolleyTeamId) return json({ error: 'Team has no Swiss Volley ID' }, { status: 400 });

	const synced = await syncMatches(teamId, team.swissVolleyTeamId, orgId);
	return json({ ok: true, synced });
};
