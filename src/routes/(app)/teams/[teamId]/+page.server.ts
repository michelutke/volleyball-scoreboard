import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { matches, teams } from '$lib/server/db/schema.js';
import { syncMatches } from '$lib/server/sync.js';
import { shouldSync } from '$lib/server/sync-throttle.js';
import { toMatchListItems } from '$lib/server/match-list.js';
import { and, eq, desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params, locals, setHeaders }) => {
	const { orgId } = locals;
	const teamId = parseInt(params.teamId);

	const team = await db.query.teams.findFirst({
		where: and(eq(teams.orgId, orgId), eq(teams.id, teamId))
	});
	if (!team) error(404, 'Team not found');

	if (team.swissVolleyTeamId && shouldSync(`matches:${orgId}:${teamId}`)) {
		syncMatches(teamId, team.swissVolleyTeamId, orgId).catch(() => {});
	}

	const teamMatches = await db.query.matches.findMany({
		where: and(eq(matches.orgId, orgId), eq(matches.teamId, teamId)),
		orderBy: desc(matches.scheduledAt)
	});

	setHeaders({ 'cache-control': 'private, max-age=60' });

	return {
		team: { id: team.id, name: team.name, swissVolleyTeamId: team.swissVolleyTeamId },
		matches: await toMatchListItems(teamMatches)
	};
};
