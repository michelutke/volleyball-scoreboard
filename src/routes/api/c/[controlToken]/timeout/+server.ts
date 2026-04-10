import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { matches, timeouts, scores } from '$lib/server/db/schema.js';
import { matchSSEEmitter } from '$lib/server/sse.js';
import { controlTimeoutSchema } from '$lib/server/validation.js';
import { eq, and, desc } from 'drizzle-orm';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ params, request }) => {
	const { controlToken } = params;
	const raw = await request.json();
	const parsed = controlTimeoutSchema.safeParse(raw);
	if (!parsed.success) return json({ error: 'Invalid input' }, { status: 400 });
	const { team } = parsed.data;

	const match = await db.query.matches.findFirst({
		where: eq(matches.controlToken, controlToken)
	});
	if (!match) return json({ error: 'Match not found' }, { status: 404 });

	const matchId = match.id;

	const currentScore = await db.query.scores.findFirst({
		where: eq(scores.matchId, matchId),
		orderBy: desc(scores.createdAt)
	});
	if (!currentScore) return json({ error: 'Score not found' }, { status: 404 });

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
	matchSSEEmitter.emit(matchId, { type: 'timeout', data: { team, teamName, active: true } });

	return json({ ok: true, timeoutsUsed: usedTimeouts.length + 1 });
};

export const DELETE: RequestHandler = async ({ params, request }) => {
	const { controlToken } = params;
	const raw = await request.json();
	const parsed = controlTimeoutSchema.safeParse(raw);
	if (!parsed.success) return json({ error: 'Invalid input' }, { status: 400 });
	const { team } = parsed.data;

	const match = await db.query.matches.findFirst({
		where: eq(matches.controlToken, controlToken)
	});
	if (!match) return json({ error: 'Match not found' }, { status: 404 });

	const matchId = match.id;

	const currentScore = await db.query.scores.findFirst({
		where: eq(scores.matchId, matchId),
		orderBy: desc(scores.createdAt)
	});
	if (!currentScore) return json({ error: 'Score not found' }, { status: 404 });

	const lastTimeout = await db.query.timeouts.findFirst({
		where: and(
			eq(timeouts.matchId, matchId),
			eq(timeouts.team, team),
			eq(timeouts.set, currentScore.currentSet)
		),
		orderBy: desc(timeouts.createdAt)
	});

	if (!lastTimeout) return json({ error: 'No timeout to cancel' }, { status: 404 });

	await db.delete(timeouts).where(eq(timeouts.id, lastTimeout.id));

	const teamName = team === 'home' ? match.homeTeamName : match.guestTeamName;
	matchSSEEmitter.emit(matchId, { type: 'timeout', data: { team, teamName, active: false } });

	const remaining = await db.query.timeouts.findMany({
		where: and(
			eq(timeouts.matchId, matchId),
			eq(timeouts.team, team),
			eq(timeouts.set, currentScore.currentSet)
		)
	});

	return json({ ok: true, timeoutsUsed: remaining.length });
};
