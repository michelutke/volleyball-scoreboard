import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { settings } from '$lib/server/db/schema.js';
import { encrypt } from '$lib/server/crypto.js';
import { and, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ locals }) => {
	const { orgId } = locals;
	const rows = await db.select().from(settings).where(eq(settings.orgId, orgId));
	const result: Record<string, string> = {};
	for (const row of rows) {
		if (row.key === 'swissVolleyApiKey') continue;
		result[row.key] = row.value;
	}
	return json(result);
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	const { orgId, isAdmin } = locals;
	if (!isAdmin) return json({ error: 'Forbidden' }, { status: 403 });

	const body: Record<string, string> = await request.json();

	for (const [key, value] of Object.entries(body)) {
		const storedValue = key === 'swissVolleyApiKey' ? encrypt(value) : value;
		await db
			.insert(settings)
			.values({ orgId, key, value: storedValue })
			.onConflictDoUpdate({ target: [settings.orgId, settings.key], set: { value: storedValue } });
	}

	return json({ ok: true });
};
