import { db } from '$lib/server/db/index.js';
import { designTemplates, matches, scores, settings, timeouts } from '$lib/server/db/schema.js';
import { toMatchState } from '$lib/server/match-state.js';
import type { MatchState } from '$lib/types.js';
import { eq, desc, and } from 'drizzle-orm';

export interface MatchOverlayDesign {
	customCode: string | null;
	templateId: number | null;
	scoreboardLayout: string | null;
	scoreboardOptions: Record<string, unknown> | null;
}

export interface MatchOverlayData extends MatchOverlayDesign {
	match: MatchState | null;
	timeouts: { home: number; guest: number };
}

export async function loadMatchOverlayDesign(match: typeof matches.$inferSelect): Promise<MatchOverlayDesign> {
	const [template, orgSettings] = await Promise.all([
		match.designTemplateId
			? db.query.designTemplates.findFirst({ where: eq(designTemplates.id, match.designTemplateId) })
			: Promise.resolve(null),
		db.query.settings.findMany({ where: eq(settings.orgId, match.orgId) })
	]);

	const templateUsable = !!template && (template.orgId === match.orgId || template.isPublic);
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
		// Custom code only from the match's own org or a public template (never another org's private one)
		customCode: templateUsable ? (template.customCode ?? null) : null,
		templateId: templateUsable ? template.id : null,
		scoreboardLayout: match.scoreboardLayout ?? orgLayout,
		scoreboardOptions: (match.scoreboardOptions as Record<string, unknown> | null) ?? orgOptions
	};
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

	const [homeTimeouts, guestTimeouts, design] = await Promise.all([
		db.query.timeouts.findMany({
			where: and(eq(timeouts.matchId, matchId), eq(timeouts.team, 'home'), eq(timeouts.set, score.currentSet))
		}),
		db.query.timeouts.findMany({
			where: and(eq(timeouts.matchId, matchId), eq(timeouts.team, 'guest'), eq(timeouts.set, score.currentSet))
		}),
		loadMatchOverlayDesign(match)
	]);

	return {
		match: toMatchState(match, score),
		timeouts: { home: homeTimeouts.length, guest: guestTimeouts.length },
		...design
	};
}
