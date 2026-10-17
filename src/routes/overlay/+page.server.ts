import { redirect } from '@sveltejs/kit';
import { ensureOverlaySlug } from '$lib/server/overlay-slug.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session ?? (await locals.auth());
	const orgId = session?.user?.orgId;
	if (!orgId) redirect(307, '/signin?callbackUrl=%2Foverlay');

	const slug = await ensureOverlaySlug(orgId);
	redirect(307, `/overlay/${slug}`);
};
