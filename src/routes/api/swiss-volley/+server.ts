import { json } from '@sveltejs/kit';
import { getTeams, getUpcomingGames } from '$lib/server/swiss-volley.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ url }) => {
	const action = url.searchParams.get('action');

	try {
		switch (action) {
			case 'teams':
				return json(await getTeams());
			case 'upcomingGames': {
				const teamId = url.searchParams.get('teamId');
				const games = await getUpcomingGames();
				if (teamId) {
					const id = parseInt(teamId);
					return json(games.filter((g) => g.teams.home.teamId === id || g.teams.away.teamId === id));
				}
				return json(games);
			}
			default:
				return json({ error: 'Unknown action' }, { status: 400 });
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return json({ error: message }, { status: 500 });
	}
};
