import type { RequestHandler } from './$types.js';
import {
	authenticateMobile,
	finishedConflict,
	mobileJson,
	notFound,
	parseMatchId
} from '$lib/server/mobile-api';
import { getOrgMatch, startMatch, toMobileMatchItem } from '$lib/server/match-service';

export const POST: RequestHandler = async ({ request, params }) => {
	const identity = await authenticateMobile(request);
	if (identity instanceof Response) return identity;
	const matchId = parseMatchId(params.matchId);
	if (matchId === null) return notFound();

	const match = await getOrgMatch(identity.orgId, matchId);
	if (!match) return notFound();
	if (match.status === 'finished') return finishedConflict();
	if (match.status === 'live') return mobileJson(toMobileMatchItem(match));

	const started = await startMatch(identity.orgId, matchId);
	if (!started) return notFound();
	return mobileJson(toMobileMatchItem(started.match));
};
