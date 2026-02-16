import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { matches, timeouts, scores } from '$lib/server/db/schema.js';
import { sseEmitter } from '$lib/server/sse.js';
import { eq, and, desc } from 'drizzle-orm';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ request }) => {
	const { matchId, team } = await request.json();

	const match = await db.query.matches.findFirst({
		where: eq(matches.id, matchId)
	});
	if (!match) return json({ error: 'Match not found' }, { status: 404 });

	const currentScore = await db.query.scores.findFirst({
		where: eq(scores.matchId, matchId),
		orderBy: desc(scores.createdAt)
	});
	if (!currentScore) return json({ error: 'Score not found' }, { status: 404 });

	// Count timeouts for this team in current set
	const usedTimeouts = await db.query.timeouts.findMany({
		where: and(
			eq(timeouts.matchId, matchId),
			eq(timeouts.team, team),
			eq(timeouts.set, currentScore.currentSet)
		)
	});

	if (usedTimeouts.length >= 2) {
		return json({ error: 'Max timeouts reached for this set' }, { status: 400 });
	}

	await db.insert(timeouts).values({
		matchId,
		team,
		set: currentScore.currentSet
	});

	const teamName = team === 'home' ? match.homeTeamName : match.guestTeamName;
	sseEmitter.emit({ type: 'timeout', data: { team, teamName, active: true } });

	return json({ ok: true, timeoutsUsed: usedTimeouts.length + 1 });
};
