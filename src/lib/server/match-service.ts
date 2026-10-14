import { and, asc, eq, gte, isNull, ne, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { matches, scores, settings } from '$lib/server/db/schema.js';
import { matchSSEEmitter } from '$lib/server/sse.js';
import { toMatchState } from '$lib/server/match-state.js';
import { autoFinishStale } from '$lib/server/auto-finish.js';
import { getDefaultTemplate, templateToMatchColors } from '$lib/server/design-template.js';
import type { MatchState, MatchStatus } from '$lib/types.js';

export type MatchRow = typeof matches.$inferSelect;

export interface MobileMatchItem {
	id: number;
	homeTeamName: string;
	guestTeamName: string;
	scheduledAt: string | null;
	venue: string | null;
	league: string | null;
	status: MatchStatus;
}

export interface StartedMatch {
	match: MatchRow;
	state: MatchState;
}

export type TokenResult = { ok: true; token: string } | { ok: false; reason: 'not_found' | 'finished' };

export const MOBILE_MATCH_LIMIT = 50;
export const UPCOMING_LOOKBACK_MS = 12 * 60 * 60 * 1000;
const MAX_ENSURE_ATTEMPTS = 2;

/** Loads a match of the given org. Returns null when it does not exist or belongs to another org. */
export async function getOrgMatch(orgId: string, matchId: number): Promise<MatchRow | null> {
	const match = await db.query.matches.findFirst({
		where: and(eq(matches.orgId, orgId), eq(matches.id, matchId))
	});
	return match ?? null;
}

/** Club name shown in the app; same source as /api/mobile/overlay-info. */
export async function getClubName(orgId: string): Promise<string> {
	const row = await db.query.settings.findFirst({
		where: and(eq(settings.orgId, orgId), eq(settings.key, 'clubName'))
	});
	return row?.value ?? '';
}

export function toMobileMatchItem(match: MatchRow): MobileMatchItem {
	return {
		id: match.id,
		homeTeamName: match.homeTeamName,
		guestTeamName: match.guestTeamName,
		scheduledAt: match.scheduledAt?.toISOString() ?? null,
		venue: match.venue,
		league: match.league,
		status: match.status
	};
}

/**
 * Live matches plus upcoming ones scheduled from 12 hours ago onward or without a date, live first,
 * then by scheduledAt (nulls last, so undated matches follow the dated ones). The lookback avoids
 * needing the org time zone.
 */
export async function listMobileMatches(orgId: string, now: Date = new Date()): Promise<MobileMatchItem[]> {
	await autoFinishStale(orgId);
	const cutoff = new Date(now.getTime() - UPCOMING_LOOKBACK_MS);
	const rows = await db
		.select()
		.from(matches)
		.where(
			and(
				eq(matches.orgId, orgId),
				or(
					eq(matches.status, 'live'),
					and(eq(matches.status, 'upcoming'), or(isNull(matches.scheduledAt), gte(matches.scheduledAt, cutoff)))
				)
			)
		)
		.orderBy(sql`case when ${matches.status} = 'live' then 0 else 1 end`, asc(matches.scheduledAt))
		.limit(MOBILE_MATCH_LIMIT);
	return rows.map(toMobileMatchItem);
}

/** Sets the match live, applies the org default template if none is assigned and creates the first score row. */
export async function startMatch(orgId: string, matchId: number): Promise<StartedMatch | null> {
	const match = await getOrgMatch(orgId, matchId);
	if (!match) return null;

	const updateData: Record<string, unknown> = { status: 'live', updatedAt: new Date() };
	if (!match.designTemplateId) {
		const defaultTemplate = await getDefaultTemplate(orgId);
		if (defaultTemplate) Object.assign(updateData, templateToMatchColors(defaultTemplate));
	}

	const [updated] = await db
		.update(matches)
		.set(updateData)
		.where(and(eq(matches.orgId, orgId), eq(matches.id, matchId)))
		.returning();
	if (!updated) return null;

	let score = await db.query.scores.findFirst({ where: eq(scores.matchId, matchId) });
	if (!score) {
		const [newScore] = await db.insert(scores).values({ matchId }).returning();
		score = newScore;
	}

	const state = toMatchState(updated, score);
	matchSSEEmitter.emit(matchId, { type: 'match', data: state });
	return { match: updated, state };
}

/**
 * Returns the current guest control token or creates one. The write is conditional on
 * control_token IS NULL so two concurrent callers end up with the same token.
 */
export async function ensureControlToken(orgId: string, matchId: number): Promise<TokenResult> {
	for (let attempt = 0; attempt < MAX_ENSURE_ATTEMPTS; attempt++) {
		const [created] = await db
			.update(matches)
			.set({ controlToken: crypto.randomUUID(), updatedAt: new Date() })
			.where(
				and(
					eq(matches.orgId, orgId),
					eq(matches.id, matchId),
					isNull(matches.controlToken),
					ne(matches.status, 'finished')
				)
			)
			.returning({ controlToken: matches.controlToken });
		if (created?.controlToken) return { ok: true, token: created.controlToken };

		const match = await getOrgMatch(orgId, matchId);
		if (!match) return { ok: false, reason: 'not_found' };
		if (match.status === 'finished') return { ok: false, reason: 'finished' };
		if (match.controlToken) return { ok: true, token: match.controlToken };
	}
	throw new Error(`ensureControlToken: control token of match ${matchId} kept changing`);
}

/** Replaces the guest control token; the previous link stops working immediately. */
export async function renewControlToken(orgId: string, matchId: number): Promise<TokenResult> {
	const [renewed] = await db
		.update(matches)
		.set({ controlToken: crypto.randomUUID(), updatedAt: new Date() })
		.where(and(eq(matches.orgId, orgId), eq(matches.id, matchId), ne(matches.status, 'finished')))
		.returning({ controlToken: matches.controlToken });
	if (renewed?.controlToken) return { ok: true, token: renewed.controlToken };

	const match = await getOrgMatch(orgId, matchId);
	return { ok: false, reason: match?.status === 'finished' ? 'finished' : 'not_found' };
}
