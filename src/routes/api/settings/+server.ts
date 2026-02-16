import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { settings } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async () => {
	const rows = await db.select().from(settings);
	const result: Record<string, string> = {};
	for (const row of rows) {
		result[row.key] = row.value;
	}
	return json(result);
};

export const PUT: RequestHandler = async ({ request }) => {
	const body: Record<string, string> = await request.json();

	for (const [key, value] of Object.entries(body)) {
		await db
			.insert(settings)
			.values({ key, value })
			.onConflictDoUpdate({ target: settings.key, set: { value } });
	}

	return json({ ok: true });
};
