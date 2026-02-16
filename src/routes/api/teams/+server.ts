import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { teams } from '$lib/server/db/schema.js';
import { asc } from 'drizzle-orm';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async () => {
	const allTeams = await db.select().from(teams).orderBy(asc(teams.name));
	return json(allTeams);
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();

	const [team] = await db
		.insert(teams)
		.values({ name: body.name, swissVolleyTeamId: body.swissVolleyTeamId ?? null })
		.returning();

	return json(team, { status: 201 });
};
