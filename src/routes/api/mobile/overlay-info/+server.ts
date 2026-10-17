import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { authenticateMobile } from '$lib/server/mobile-api';
import { ensureOverlaySlug } from '$lib/server/overlay-slug';
import { getClubName } from '$lib/server/match-service';

export const GET: RequestHandler = async ({ request }) => {
	const identity = await authenticateMobile(request);
	if (identity instanceof Response) return identity;
	const { orgId } = identity;
	const slug = await ensureOverlaySlug(orgId);
	return json({ slug, orgName: await getClubName(orgId) });
};
