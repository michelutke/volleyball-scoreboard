import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { settings, matches } from '$lib/server/db/schema.js';
import { and, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ locals }) => {
	const { orgId } = locals;
	const row = await db.query.settings.findFirst({
		where: and(eq(settings.orgId, orgId), eq(settings.key, 'permalinkOverlayMatchId'))
	});

	if (!row?.value) {
		return json({ matchId: null, homeTeamName: null, guestTeamName: null });
	}

	const matchId = parseInt(row.value);
	if (isNaN(matchId)) return json({ matchId: null, homeTeamName: null, guestTeamName: null });

	const match = await db.query.matches.findFirst({
		where: and(eq(matches.id, matchId), eq(matches.orgId, orgId))
	});

	if (!match) {
		return json({ matchId: null, homeTeamName: null, guestTeamName: null });
	}

	return json({
		matchId: match.id,
		homeTeamName: match.homeTeamName,
		guestTeamName: match.guestTeamName
	});
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	const { orgId, isAdmin } = locals;
	if (!isAdmin) return json({ error: 'Forbidden' }, { status: 403 });

	const body: { matchId: number | null } = await request.json();
	const value = body.matchId != null ? String(body.matchId) : '';

	await db
		.insert(settings)
		.values({ orgId, key: 'permalinkOverlayMatchId', value })
		.onConflictDoUpdate({
			target: [settings.orgId, settings.key],
			set: { value }
		});

	if (!value) {
		return json({ matchId: null, homeTeamName: null, guestTeamName: null });
	}

	const matchId = parseInt(value);
	if (isNaN(matchId)) return json({ matchId: null, homeTeamName: null, guestTeamName: null });

	const match = await db.query.matches.findFirst({
		where: and(eq(matches.id, matchId), eq(matches.orgId, orgId))
	});

	return json({
		matchId: match?.id ?? null,
		homeTeamName: match?.homeTeamName ?? null,
		guestTeamName: match?.guestTeamName ?? null
	});
};
