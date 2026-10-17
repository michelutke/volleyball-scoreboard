import type { RequestHandler } from './$types.js';
import { authenticateMobile, notFound, parseMatchId, shareResponse } from '$lib/server/mobile-api';
import { renewControlToken } from '$lib/server/match-service';

export const POST: RequestHandler = async ({ request, params, url }) => {
	const identity = await authenticateMobile(request);
	if (identity instanceof Response) return identity;
	const matchId = parseMatchId(params.matchId);
	if (matchId === null) return notFound();
	return shareResponse(await renewControlToken(identity.orgId, matchId), url.origin, matchId);
};
