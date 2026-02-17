import { json } from '@sveltejs/kit';
import { syncTeams } from '$lib/server/sync.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async () => {
	const synced = await syncTeams();
	return json({ ok: true, synced });
};
