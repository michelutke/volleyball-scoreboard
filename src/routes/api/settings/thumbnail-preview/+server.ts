import { renderPreviewThumbnail } from '$lib/server/thumbnail/service';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ locals }) => {
	const jpeg = await renderPreviewThumbnail(locals.orgId);
	return new Response(jpeg, { headers: { 'Content-Type': 'image/jpeg' } });
};
