import { json } from '@sveltejs/kit';
import { IMAGE_SECURITY_HEADERS } from '$lib/server/image-proxy';
import {
	ImageUploadError,
	deleteOrgImage,
	getOrgImage,
	parseImageKind,
	readImageUpload,
	saveOrgImage
} from '$lib/server/org-images';
import type { RequestHandler } from './$types.js';

const NO_STORE = { 'Cache-Control': 'no-store' };

function badKind(): Response {
	return json({ error: 'Unbekannte Bildart.' }, { status: 400, headers: NO_STORE });
}

export const GET: RequestHandler = async ({ params, locals }) => {
	const kind = parseImageKind(params.kind);
	if (!kind) return badKind();
	const image = await getOrgImage(locals.orgId, kind);
	if (!image) return json({ error: 'Not found' }, { status: 404, headers: NO_STORE });
	return new Response(image.data, {
		headers: { ...IMAGE_SECURITY_HEADERS, ...NO_STORE, 'Content-Type': image.contentType }
	});
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.isAdmin) return json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE });
	const kind = parseImageKind(params.kind);
	if (!kind) return badKind();
	try {
		const upload = await readImageUpload(request);
		const updatedAt = await saveOrgImage(locals.orgId, kind, upload);
		return json({ kind, updatedAt: updatedAt.toISOString() }, { headers: NO_STORE });
	} catch (error) {
		if (error instanceof ImageUploadError) {
			return json({ error: error.message }, { status: error.status, headers: NO_STORE });
		}
		throw error;
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.isAdmin) return json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE });
	const kind = parseImageKind(params.kind);
	if (!kind) return badKind();
	await deleteOrgImage(locals.orgId, kind);
	return json({ ok: true }, { headers: NO_STORE });
};
