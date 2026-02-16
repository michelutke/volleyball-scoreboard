import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { settings } from '$lib/server/db/schema.js';
import { syncTeams } from '$lib/server/sync.js';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async () => {
	const clubIdSetting = await db.query.settings.findFirst({
		where: eq(settings.key, 'swissVolleyClubId')
	});
	if (!clubIdSetting) return json({ error: 'No club ID configured' }, { status: 400 });

	const synced = await syncTeams(clubIdSetting.value);
	return json({ ok: true, synced });
};
