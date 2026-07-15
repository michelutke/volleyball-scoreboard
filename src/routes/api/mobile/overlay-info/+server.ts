import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { settings } from '$lib/server/db/schema.js';
import { verifyMobileToken } from '$lib/server/mobile-auth';

export const GET: RequestHandler = async ({ request }) => {
	const auth = request.headers.get('authorization');
	if (!auth?.startsWith('Bearer ')) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}
	const orgId = await verifyMobileToken(auth.slice('Bearer '.length));
	if (!orgId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}
	const slugRow = await db.query.settings.findFirst({
		where: and(eq(settings.orgId, orgId), eq(settings.key, 'overlaySlug'))
	});
	if (!slugRow?.value) {
		return json({ error: 'No overlay slug configured' }, { status: 404 });
	}
	const nameRow = await db.query.settings.findFirst({
		where: and(eq(settings.orgId, orgId), eq(settings.key, 'clubName'))
	});
	return json({ slug: slugRow.value, orgName: nameRow?.value ?? '' });
};
