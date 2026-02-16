import { json } from '@sveltejs/kit';
import { getTeams, getUpcomingMatches, searchClubs } from '$lib/server/swiss-volley.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ url }) => {
	const action = url.searchParams.get('action');
	const clubId = url.searchParams.get('clubId');
	const teamId = url.searchParams.get('teamId');
	const query = url.searchParams.get('query');

	try {
		switch (action) {
			case 'teams': {
				if (!clubId) return json({ error: 'Missing clubId' }, { status: 400 });
				const teams = await getTeams(clubId);
				return json(teams);
			}
			case 'matches': {
				if (!teamId) return json({ error: 'Missing teamId' }, { status: 400 });
				const matches = await getUpcomingMatches(teamId);
				return json(matches);
			}
			case 'searchClubs': {
				if (!query) return json({ error: 'Missing query' }, { status: 400 });
				const clubs = await searchClubs(query);
				return json(clubs);
			}
			default:
				return json({ error: 'Unknown action' }, { status: 400 });
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return json({ error: message }, { status: 500 });
	}
};
