import type { RequestHandler } from './$types.js';
import { authenticateMobile, mobileJson } from '$lib/server/mobile-api';
import { getClubName, listMobileMatches } from '$lib/server/match-service';

export const GET: RequestHandler = async ({ request }) => {
	const identity = await authenticateMobile(request);
	if (identity instanceof Response) return identity;
	const [orgName, matches] = await Promise.all([
		getClubName(identity.orgId),
		listMobileMatches(identity.orgId)
	]);
	return mobileJson({ orgName, matches });
};
