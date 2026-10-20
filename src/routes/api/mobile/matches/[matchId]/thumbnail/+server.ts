import type { RequestHandler } from './$types.js';
import {
	authenticateMobile,
	jpegResponse,
	mobileJson,
	notFound,
	parseMatchId
} from '$lib/server/mobile-api';
import { getOrgMatch } from '$lib/server/match-service';
import { ImageUploadError, readImageUpload } from '$lib/server/org-images';
import { renderMatchThumbnail } from '$lib/server/thumbnail/service';

export const GET: RequestHandler = async ({ request, params }) => {
	const identity = await authenticateMobile(request);
	if (identity instanceof Response) return identity;
	const matchId = parseMatchId(params.matchId);
	if (matchId === null) return notFound();
	const match = await getOrgMatch(identity.orgId, matchId);
	if (!match) return notFound();
	return jpegResponse(await renderMatchThumbnail(identity.orgId, match));
};

export const POST: RequestHandler = async ({ request, params }) => {
	const identity = await authenticateMobile(request);
	if (identity instanceof Response) return identity;
	const matchId = parseMatchId(params.matchId);
	if (matchId === null) return notFound();
	const match = await getOrgMatch(identity.orgId, matchId);
	if (!match) return notFound();
	try {
		const override = await readImageUpload(request);
		return jpegResponse(await renderMatchThumbnail(identity.orgId, match, override.data));
	} catch (error) {
		if (error instanceof ImageUploadError) return mobileJson({ error: error.message }, error.status);
		throw error;
	}
};
