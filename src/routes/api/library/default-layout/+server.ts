import { db } from '$lib/server/db/index.js';
import { settings } from '$lib/server/db/schema.js';
import { json, error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { RequestHandler } from './$types.js';

const KEY_LAYOUT = 'defaultScoreboardLayout';
const KEY_OPTIONS = 'defaultScoreboardOptions';

const bodySchema = z.object({
	layoutId: z.string().min(1).max(64),
	options: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional()
});

async function upsert(orgId: string, key: string, value: string) {
	const existing = await db.query.settings.findFirst({
		where: and(eq(settings.orgId, orgId), eq(settings.key, key))
	});
	if (existing) {
		await db.update(settings).set({ value }).where(and(eq(settings.orgId, orgId), eq(settings.key, key)));
	} else {
		await db.insert(settings).values({ orgId, key, value });
	}
}

export const PUT: RequestHandler = async ({ locals, request }) => {
	const orgId = locals.orgId;
	if (!orgId) error(401, 'Unauthorized');

	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) error(400, 'Invalid body');

	await upsert(orgId, KEY_LAYOUT, parsed.data.layoutId);
	if (parsed.data.options) {
		await upsert(orgId, KEY_OPTIONS, JSON.stringify(parsed.data.options));
	}
	return json({ ok: true });
};

export const GET: RequestHandler = async ({ locals }) => {
	const orgId = locals.orgId;
	if (!orgId) error(401, 'Unauthorized');

	const rows = await db.query.settings.findMany({
		where: and(eq(settings.orgId, orgId))
	});
	const layoutRow = rows.find((r) => r.key === KEY_LAYOUT);
	const optsRow = rows.find((r) => r.key === KEY_OPTIONS);
	let options: Record<string, unknown> | null = null;
	if (optsRow?.value) {
		try {
			options = JSON.parse(optsRow.value);
		} catch {
			options = null;
		}
	}
	return json({ layoutId: layoutRow?.value ?? null, options });
};
