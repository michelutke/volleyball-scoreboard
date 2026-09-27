import { db } from '$lib/server/db/index.js';
import { designTemplates, matches, scores, settings, timeouts } from '$lib/server/db/schema.js';
import { toMatchState } from '$lib/server/match-state.js';
import type { MatchState } from '$lib/types.js';
import { eq, desc, and } from 'drizzle-orm';

export interface MatchOverlayData {
	match: MatchState | null;
	timeouts: { home: number; guest: number };
	customCode: string | null;
	templateId: number | null;
	scoreboardLayout: string | null;
	scoreboardOptions: Record<string, unknown> | null;
}

export async function loadMatchOverlayData(matchId: number): Promise<MatchOverlayData> {
	const match = await db.query.matches.findFirst({
		where: eq(matches.id, matchId)
	});
	if (!match) {
		return {
			match: null,
			timeouts: { home: 0, guest: 0 },
			customCode: null,
			templateId: null,
			scoreboardLayout: null,
			scoreboardOptions: null
		};
	}

	const score = await db.query.scores.findFirst({
		where: eq(scores.matchId, matchId),
		orderBy: desc(scores.createdAt)
	});

	if (!score) {
		return {
			match: null,
			timeouts: { home: 0, guest: 0 },
			customCode: null,
			templateId: null,
			scoreboardLayout: null,
			scoreboardOptions: null
		};
	}

	const [homeTimeouts, guestTimeouts, template, orgSettings] = await Promise.all([
		db.query.timeouts.findMany({
			where: and(eq(timeouts.matchId, matchId), eq(timeouts.team, 'home'), eq(timeouts.set, score.currentSet))
		}),
		db.query.timeouts.findMany({
			where: and(eq(timeouts.matchId, matchId), eq(timeouts.team, 'guest'), eq(timeouts.set, score.currentSet))
		}),
		match.designTemplateId
			? db.query.designTemplates.findFirst({ where: eq(designTemplates.id, match.designTemplateId) })
			: Promise.resolve(null),
		db.query.settings.findMany({ where: eq(settings.orgId, match.orgId) })
	]);

	const orgLayout = orgSettings.find((r) => r.key === 'defaultScoreboardLayout')?.value ?? null;
	const orgOptionsRaw = orgSettings.find((r) => r.key === 'defaultScoreboardOptions')?.value ?? null;
	let orgOptions: Record<string, unknown> | null = null;
	if (orgOptionsRaw) {
		try {
			orgOptions = JSON.parse(orgOptionsRaw);
		} catch {
			orgOptions = null;
		}
	}

	return {
		match: toMatchState(match, score),
		timeouts: { home: homeTimeouts.length, guest: guestTimeouts.length },
		customCode: template?.customCode ?? null,
		templateId: match.designTemplateId ?? null,
		scoreboardLayout: match.scoreboardLayout ?? orgLayout,
		scoreboardOptions: (match.scoreboardOptions as Record<string, unknown> | null) ?? orgOptions
	};
}
