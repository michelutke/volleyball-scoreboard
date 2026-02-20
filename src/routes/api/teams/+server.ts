import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { teams } from '$lib/server/db/schema.js';
import { asc, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ locals }) => {
	const { orgId } = locals;
	const allTeams = await db.select().from(teams).where(eq(teams.orgId, orgId)).orderBy(asc(teams.name));
	return json(allTeams);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.isAdmin) return json({ error: 'Forbidden' }, { status: 403 });
	const { orgId } = locals;
	const body = await request.json();

	const [team] = await db
		.insert(teams)
		.values({ orgId, name: body.name, swissVolleyTeamId: body.swissVolleyTeamId ?? null })
		.returning();

	return json(team, { status: 201 });
};
