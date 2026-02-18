import { json } from '@sveltejs/kit';
import { syncTeams } from '$lib/server/sync.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ locals }) => {
	const { orgId } = locals;
	const synced = await syncTeams(orgId);
	return json({ ok: true, synced });
};
