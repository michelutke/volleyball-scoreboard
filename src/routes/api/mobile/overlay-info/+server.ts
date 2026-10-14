import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { verifyMobileToken } from '$lib/server/mobile-auth';
import { ensureOverlaySlug } from '$lib/server/overlay-slug';
import { getClubName } from '$lib/server/match-service';

export const GET: RequestHandler = async ({ request }) => {
	const auth = request.headers.get('authorization');
	if (!auth?.startsWith('Bearer ')) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}
	const identity = await verifyMobileToken(auth.slice('Bearer '.length));
	if (!identity) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}
	const { orgId } = identity;
	const slug = await ensureOverlaySlug(orgId);
	return json({ slug, orgName: await getClubName(orgId) });
};
