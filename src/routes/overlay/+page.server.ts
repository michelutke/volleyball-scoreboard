import { redirect } from '@sveltejs/kit';
import { ensureOverlaySlug } from '$lib/server/overlay-slug.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals }) => {
	const slug = await ensureOverlaySlug(locals.orgId);
	redirect(307, `/overlay/${slug}`);
};
