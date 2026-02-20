import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { matches } from '$lib/server/db/schema.js';
import { toMatchListItems } from '$lib/server/match-list.js';
import { and, eq, desc } from 'drizzle-orm';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ params, locals }) => {
	const { orgId } = locals;
	const teamId = parseInt(params.teamId);

	const teamMatches = await db.query.matches.findMany({
		where: and(eq(matches.orgId, orgId), eq(matches.teamId, teamId)),
		orderBy: desc(matches.scheduledAt)
	});

	return json(await toMatchListItems(teamMatches));
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const { orgId } = locals;
	const teamId = parseInt(params.teamId);
	const body = await request.json();

	const [match] = await db
		.insert(matches)
		.values({
			orgId,
			teamId,
			homeTeamName: body.homeTeamName ?? 'Heim',
			guestTeamName: body.guestTeamName ?? 'Gast',
			scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
			venue: body.venue ?? null,
			league: body.league ?? null,
			status: 'upcoming'
		})
		.returning();

	return json(match, { status: 201 });
};
