import type { RequestHandler } from './$types.js';
import { authenticateMobile, jpegResponse, mobileJson } from '$lib/server/mobile-api';
import { ImageUploadError, readImageUpload } from '$lib/server/org-images';
import { renderTitledThumbnail } from '$lib/server/thumbnail/service';

const MAX_TITLE_LENGTH = 100;
const FORMAT_CHARACTERS = /\p{Cf}/gu;

interface TitledStream {
	title: string;
}

function parseStream(url: URL): TitledStream | Response {
	const title = (url.searchParams.get('title') ?? '').replace(FORMAT_CHARACTERS, '').trim();
	if (Array.from(title).length < 1 || Array.from(title).length > MAX_TITLE_LENGTH) {
		return mobileJson({ error: `title muss 1 bis ${MAX_TITLE_LENGTH} Zeichen lang sein.` }, 400);
	}
	return { title };
}

export const GET: RequestHandler = async ({ request, url }) => {
	const identity = await authenticateMobile(request);
	if (identity instanceof Response) return identity;
	const stream = parseStream(url);
	if (stream instanceof Response) return stream;
	return jpegResponse(await renderTitledThumbnail(identity.orgId, stream));
};

export const POST: RequestHandler = async ({ request, url }) => {
	const identity = await authenticateMobile(request);
	if (identity instanceof Response) return identity;
	const stream = parseStream(url);
	if (stream instanceof Response) return stream;
	try {
		const override = await readImageUpload(request);
		return jpegResponse(await renderTitledThumbnail(identity.orgId, stream, override.data));
	} catch (error) {
		if (error instanceof ImageUploadError) return mobileJson({ error: error.message }, error.status);
		throw error;
	}
};
