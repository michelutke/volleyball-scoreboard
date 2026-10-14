import type { RequestHandler } from './$types.js';
import { authenticateMobile, mobileJson, unauthorized } from '$lib/server/mobile-api';
import { getClubName, listMobileMatches } from '$lib/server/match-service';

export const GET: RequestHandler = async ({ request }) => {
	const identity = await authenticateMobile(request);
	if (!identity) return unauthorized();
	const [orgName, matches] = await Promise.all([
		getClubName(identity.orgId),
		listMobileMatches(identity.orgId)
	]);
	return mobileJson({ orgName, matches });
};
