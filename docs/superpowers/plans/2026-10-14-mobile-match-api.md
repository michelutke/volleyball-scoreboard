# Mobile Match API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the Scorely Live app list the club's matches, start one, and hand out (and renew) the guest scorer link, with the link expiring 10 minutes after the match is finished, plus the security fixes found during exploration.
**Architecture:** A new `src/lib/server/match-service.ts` owns org-scoped match lookup, start, list and control token logic, and both the existing web routes and four new bearer-authenticated routes under `/api/mobile/matches` call it. A small `src/lib/server/mobile-api.ts` holds the shared bearer auth, JSON and status helpers for the mobile routes. Finishing a match (score logic and `autoFinishStale`) stamps the new nullable column `matches.finished_at`. The guest routes `/c/*` and `/api/c/*` keep working for a 10 minute grace period after that (so the guest can undo a wrong final point), then answer 410 and clear `controlToken` lazily on access; `autoFinishStale` also clears the tokens of matches finished more than 10 minutes ago.
**Tech Stack:** SvelteKit 2 (adapter-node), Svelte 5, TypeScript, Drizzle ORM 0.45 and drizzle-kit 0.31 on Postgres, Keycloak (jose JWT verification), Vitest 4.
**Spec:** /Users/miggi/miggisrc/scorely-live/docs/superpowers/specs/2026-10-14-scorely-match-workflow-design.md (Part 1)

## Global Constraints

- Endpoints: `GET /api/mobile/matches`, `POST /api/mobile/matches/{id}/start`, `POST /api/mobile/matches/{id}/share`, `POST /api/mobile/matches/{id}/share/renew`.
- Auth: `Authorization: Bearer <token>` verified by `verifyMobileToken`; missing header, non-Bearer header or failed verification returns 401 `{ "error": "Unauthorized" }`.
- Token `azp` must equal `MOBILE_CLIENT_ID` (default `scorely-mobile`); anything else is 401.
- `verifyMobileToken` returns `{ orgId, sub, roles }` or null.
- No role check on any mobile endpoint: every member of the org may list, start, share and renew (same as the web). `roles` is only carried for later use.
- Every match lookup is scoped to the caller's org; a match of another org, a missing match or a malformed id returns 404 `{ "error": "Match not found" }`.
- `finished` match on start, share or renew returns 409 `{ "error": "Match is finished" }`.
- Guest link grace period: `GUEST_LINK_GRACE_MS = 10 * 60 * 1000` (exported from `src/lib/server/auto-finish.ts`). `/c/{token}` page and `/api/c/{token}` (incl. `/timeout`) keep working while the match is not `finished`, and for 10 minutes after `finished_at` when it is. After that (or for a `finished` match with `finished_at` null, i.e. finished before this deploy) they clear `controlToken` and return 410; the page shows a friendly German message.
- New column `matches.finished_at` (`timestamp`, nullable), migration `drizzle/0008_match_finished_at.sql` generated with drizzle-kit. Set by `statusChange('finished')` and `autoFinishStale`; set to null by `statusChange` for any other status (undo back to `live`).
- Every mobile response carries `Cache-Control: no-store` (set explicitly by `mobileJson` and again by `src/hooks.server.ts` lines 91 to 94 for all non-public paths).
- Rate limit: the existing hook limit for `/api/*` applies unchanged to `/api/mobile/*` (100 requests per 60 s per client IP, 429 `{ "error": "Too many requests" }`, `src/hooks.server.ts` lines 75 to 82). No hook change.
- List filter: org matches with status `live`, plus `upcoming` with `scheduledAt` null or `scheduledAt >= now - 12 hours`. Upcoming matches more than 12 hours in the past stay hidden.
- List order: live first, then `scheduledAt` ascending (Postgres ASC puts null last, so undated matches come after dated ones). Limit 50. `autoFinishStale(orgId)` runs before the query.
- List response shape: `{ orgName: string, matches: MobileMatchItem[] }`; `orgName` is the org setting `clubName` (empty string when unset, same source as `/api/mobile/overlay-info`).
- List item and start response shape: `{ id: number, homeTeamName: string, guestTeamName: string, scheduledAt: string | null (ISO 8601), venue: string | null, league: string | null, status: 'upcoming' | 'live' | 'finished' }`.
- Share and renew response shape: `{ controlUrl: "{origin}/c/{token}", overlayUrl: "{origin}/matches/{id}/overlay" }`, origin from `url.origin` (adapter-node uses `ORIGIN`).
- Success status of start, share and renew is always 200 (never 201).
- Start: `upcoming` becomes `live` via `startMatch`; `live` returns 200 with the item and no write.
- Share reuses an existing token (`ensureControlToken`); renew always replaces it (`renewControlToken`).
- When a match becomes `finished`, `controlToken` is kept and `finished_at` is set. Undo back to `live` within the grace period clears `finished_at` and the link keeps working normally. Mobile share and renew still return 409 for every `finished` match, also within the grace period.
- POST bodies are empty; SvelteKit CSRF protection only blocks form content types, so the app must not send `application/x-www-form-urlencoded`, `multipart/form-data` or `text/plain`.
- Tests: Vitest, run with `npx vitest run <path>`; full suite `npm test`; type check `npm run check`.
- Commits: conventional commits, no Co-Authored-By, no AI hints, never `git rebase`.

## Review Focus

1. **Match of another org.** Every service write must carry `org_id` in its WHERE clause, not only the initial read, otherwise a race or a refactor lets one club start or share another club's match. Pinned by Task 1 tests `getOrgMatch scopes the query to org and id`, `ensureControlToken only writes when no token exists and the match is not finished` and `renewControlToken writes only for the caller's org and not for finished matches` (rendered SQL params include `org-1`), and by Task 5 and 6 route tests `returns 404 for a match of another org`. Only exception: `expireGuestLink` (Task 7) writes by id alone, because the guest routes have no org context; the id comes from the token lookup and the write only clears the token.
2. **Concurrent share and renew.** Two phones (or a double tap) calling share at once must get the same link; a naive read-then-write gives the first caller a link that is already dead. `ensureControlToken` writes only `WHERE control_token IS NULL`, then re-reads. Pinned by Task 1 test `ensureControlToken returns the token written by a concurrent caller without writing again`.
3. **Finished match undo.** Within the 10 minute grace period the guest's undo of the final point flips status back to `live`, sets `finished_at` to null and keeps the token, so the link keeps working normally. After the grace period the token is cleared on the next guest access or `autoFinishStale` run; a later web undo gives a `live` match with a null token and the next share creates a fresh one. Pinned by Task 7 tests `statusChange stamps finishedAt for finished and clears it for any other status`, `allows the guest to undo the final point within the grace period` and Task 1 test `ensureControlToken creates a token when none exists` (live match with null token after undo). Known gap, accepted: a web undo more than 10 minutes after the finish, before any guest access or `autoFinishStale` run, revives the old link of the same club.
4. **Upcoming match far in the past.** `autoFinishStale` only finishes `live` matches, so stale `upcoming` matches stay `upcoming` forever; the 12 hour lookback is the only thing hiding them. Pinned by Task 1 test `listMobileMatches filters live plus upcoming from 12 hours ago, live first, limit 50` (asserts cutoff param is exactly `now - 12h`).
5. **Missing scheduledAt.** Manually created matches may have `scheduledAt = null`: an upcoming one is listed through the explicit `is null` branch (a plain `>=` comparison with null is false and would hide it) and sorts after the dated upcoming ones; a live one sorts last among live. Pinned by the same Task 1 list test (asserts the exact WHERE structure including `"matches"."scheduled_at" is null` and the `"matches"."scheduled_at" asc` ordering) and Task 1 test `toMobileMatchItem maps a match without scheduledAt to null`.
6. **Grace period boundary and legacy rows.** A guest link must expire at exactly 10 minutes after `finished_at`, and a `finished` match with `finished_at` null (finished before this deploy) must count as expired, otherwise old finished links live forever. Expiry clears the token so a replaced or expired link becomes a plain 404 afterwards. Pinned by Task 7 tests `isGuestLinkExpired ...` and `returns 410 after the grace period and clears the token`, and by the Task 7 `autoFinishStale` test that asserts the rendered token clearing WHERE.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/lib/server/match-service.ts` | Create | Org-scoped match lookup, club name, mobile list, start, ensure and renew control token, `statusChange` (finish stamps `finishedAt`), guest link expiry helpers |
| `src/lib/server/match-service.test.ts` | Create | Unit tests for the service (mocked db, rendered SQL) |
| `src/lib/server/mobile-api.ts` | Create | Bearer auth helper, `mobileJson` with no-store, 401/404/409 responses, match id parsing, share URL building |
| `src/lib/server/mobile-api.test.ts` | Create | Unit tests for the mobile helpers |
| `src/lib/server/mobile-auth.ts` | Modify | `MobileIdentity`, `extractRoles`, `resolveMobileIdentity`; `verifyMobileToken` returns identity |
| `src/lib/server/mobile-auth.test.ts` | Modify | Tests for roles and identity |
| `src/routes/api/mobile/overlay-info/+server.ts` | Modify | Use `identity.orgId` |
| `src/routes/api/mobile/overlay-info/server.test.ts` | Modify | Mock returns identity objects |
| `.env.example` | Modify | Document `MOBILE_CLIENT_ID` |
| `src/routes/api/mobile/matches/+server.ts` | Create | `GET` list |
| `src/routes/api/mobile/matches/server.test.ts` | Create | Route tests |
| `src/routes/api/mobile/matches/[matchId]/start/+server.ts` | Create | `POST` start |
| `src/routes/api/mobile/matches/[matchId]/start/server.test.ts` | Create | Route tests |
| `src/routes/api/mobile/matches/[matchId]/share/+server.ts` | Create | `POST` share |
| `src/routes/api/mobile/matches/[matchId]/share/server.test.ts` | Create | Route tests |
| `src/routes/api/mobile/matches/[matchId]/share/renew/+server.ts` | Create | `POST` renew |
| `src/routes/api/mobile/matches/[matchId]/share/renew/server.test.ts` | Create | Route tests |
| `src/routes/api/matches/[matchId]/activate/+server.ts` | Modify | Delegate to `startMatch` |
| `src/routes/api/matches/[matchId]/activate/server.test.ts` | Create | Route tests |
| `src/routes/api/matches/[matchId]/+server.ts` | Modify | `generateControlToken` uses `renewControlToken`; status writes use `statusChange` |
| `src/routes/matches/[matchId]/control/+page.server.ts` | Modify | Load match via `getOrgMatch` (org filter) |
| `src/routes/matches/[matchId]/control/page.server.test.ts` | Create | Foreign org 404 test |
| `src/routes/api/teams/[teamId]/matches/+server.ts` | Modify | POST verifies team ownership |
| `src/routes/api/teams/[teamId]/matches/server.test.ts` | Create | Ownership tests |
| `src/lib/server/db/schema.ts` | Modify | `matches.finishedAt` column |
| `drizzle/0008_match_finished_at.sql` | Create (generated) | `ALTER TABLE "matches" ADD COLUMN "finished_at" timestamp;` |
| `drizzle/meta/_journal.json`, `drizzle/meta/0008_snapshot.json` | Modify / Create (generated) | drizzle-kit journal entry and snapshot for 0008 |
| `src/lib/server/auto-finish.ts` | Modify | `GUEST_LINK_GRACE_MS`; stamp `finishedAt` when auto-finishing; clear tokens of matches finished longer than the grace period |
| `src/lib/server/auto-finish.test.ts` | Create | Tests for finishing and token clearing |
| `src/routes/api/c/[controlToken]/+server.ts` | Modify | 410 after the grace period; status writes use `statusChange` |
| `src/routes/api/c/[controlToken]/server.test.ts` | Create | Grace period, 410 and lazy token clearing |
| `src/routes/api/c/[controlToken]/timeout/+server.ts` | Modify | 410 after the grace period |
| `src/routes/api/c/[controlToken]/timeout/server.test.ts` | Create | 410 tests |
| `src/routes/api/match/+server.ts` | Modify | Legacy status writes use `statusChange` |
| `src/routes/c/[controlToken]/+page.server.ts` | Modify | 410 after the grace period |
| `src/routes/c/[controlToken]/page.server.test.ts` | Create | 404, grace period and 410 tests |
| `src/routes/c/[controlToken]/+error.svelte` | Create | Friendly expired link page |
| `src/routes/c/[controlToken]/+page.svelte` | Modify | Reload into the error page when the API answers 404 or 410 |

---

## Task 1: Extract match-service

**Files:**
- Create: `src/lib/server/match-service.ts`
- Create: `src/lib/server/match-service.test.ts`
- Create: `src/routes/api/matches/[matchId]/activate/server.test.ts`
- Modify: `src/routes/api/matches/[matchId]/activate/+server.ts` (replace lines 1 to 52, whole file)
- Modify: `src/routes/api/matches/[matchId]/+server.ts` (imports lines 1 to 11, `generateControlToken` case lines 78 to 82)
- Test: `npx vitest run src/lib/server/match-service.test.ts "src/routes/api/matches/[matchId]/activate"`

**Interfaces:**
- Consumes: `db` (`$lib/server/db/index.js`), `matches`, `scores`, `settings` (`$lib/server/db/schema.js`), `matchSSEEmitter.emit(matchId: number, event: SSEEvent)` (`$lib/server/sse.js`), `toMatchState(match: MatchRow, score: ScoreRow): MatchState` (`$lib/server/match-state.js`), `autoFinishStale(orgId: string): Promise<void>` (`$lib/server/auto-finish.js`), `getDefaultTemplate(orgId: string)` and `templateToMatchColors(template)` (`$lib/server/design-template.js`), `MatchState`, `MatchStatus` (`$lib/types.js`).
- Produces:
  - `export type MatchRow = typeof matches.$inferSelect;`
  - `export interface MobileMatchItem { id: number; homeTeamName: string; guestTeamName: string; scheduledAt: string | null; venue: string | null; league: string | null; status: MatchStatus; }`
  - `export interface StartedMatch { match: MatchRow; state: MatchState; }`
  - `export type TokenResult = { ok: true; token: string } | { ok: false; reason: 'not_found' | 'finished' };`
  - `export const MOBILE_MATCH_LIMIT = 50;`
  - `export const UPCOMING_LOOKBACK_MS = 12 * 60 * 60 * 1000;`
  - `export async function getOrgMatch(orgId: string, matchId: number): Promise<MatchRow | null>`
  - `export async function getClubName(orgId: string): Promise<string>` (org setting `clubName`, empty string when unset)
  - `export function toMobileMatchItem(match: MatchRow): MobileMatchItem`
  - `export async function listMobileMatches(orgId: string, now?: Date): Promise<MobileMatchItem[]>`
  - `export async function startMatch(orgId: string, matchId: number): Promise<StartedMatch | null>`
  - `export async function ensureControlToken(orgId: string, matchId: number): Promise<TokenResult>`
  - `export async function renewControlToken(orgId: string, matchId: number): Promise<TokenResult>`

Note: `startMatch` keeps the current web behaviour (no status guard, so the web control page can still re-activate any match). The mobile route adds the status rules. The only behaviour change for the web is that `generateControlToken` now answers 409 for a finished match (after Task 7 a guest link of a finished match lives at most 10 more minutes, so a fresh one is useless).

- [ ] **Step 1: Write the failing service test**

Create `src/lib/server/match-service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';

const matchesFindFirstMock = vi.hoisted(() => vi.fn());
const scoresFindFirstMock = vi.hoisted(() => vi.fn());
const settingsFindFirstMock = vi.hoisted(() => vi.fn());
const updateSetMock = vi.hoisted(() => vi.fn());
const updateWhereMock = vi.hoisted(() => vi.fn());
const updateReturningMock = vi.hoisted(() => vi.fn());
const insertValuesMock = vi.hoisted(() => vi.fn());
const insertReturningMock = vi.hoisted(() => vi.fn());
const selectChain = vi.hoisted(() => ({
	from: vi.fn(),
	where: vi.fn(),
	orderBy: vi.fn(),
	limit: vi.fn()
}));
const emitMock = vi.hoisted(() => vi.fn());
const getDefaultTemplateMock = vi.hoisted(() => vi.fn());
const autoFinishStaleMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db/index.js', () => ({
	db: {
		query: {
			matches: { findFirst: matchesFindFirstMock },
			scores: { findFirst: scoresFindFirstMock },
			settings: { findFirst: settingsFindFirstMock }
		},
		update: () => ({ set: updateSetMock }),
		insert: () => ({ values: insertValuesMock }),
		select: () => selectChain
	}
}));
vi.mock('$lib/server/sse.js', () => ({ matchSSEEmitter: { emit: emitMock } }));
vi.mock('$lib/server/design-template.js', () => ({
	getDefaultTemplate: getDefaultTemplateMock,
	templateToMatchColors: (t: { id: number }) => ({ designTemplateId: t.id, overlayBg: '#000000' })
}));
vi.mock('$lib/server/auto-finish.js', () => ({ autoFinishStale: autoFinishStaleMock }));

const {
	getOrgMatch,
	getClubName,
	toMobileMatchItem,
	listMobileMatches,
	startMatch,
	ensureControlToken,
	renewControlToken,
	MOBILE_MATCH_LIMIT
} = await import('./match-service');

const dialect = new PgDialect();
const render = (s: SQL | undefined) => dialect.sqlToQuery(s!);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function matchRow(overrides: Record<string, unknown> = {}) {
	return {
		id: 7,
		orgId: 'org-1',
		teamId: 1,
		homeTeamName: 'VBC Home',
		guestTeamName: 'VBC Guest',
		status: 'upcoming',
		scheduledAt: new Date('2026-10-14T18:00:00.000Z'),
		venue: 'Halle A',
		league: '2. Liga',
		controlToken: null,
		finishedAt: null,
		designTemplateId: null,
		...overrides
	};
}

function scoreRow(overrides: Record<string, unknown> = {}) {
	return {
		id: 1,
		matchId: 7,
		homePoints: 0,
		guestPoints: 0,
		homeSets: 0,
		guestSets: 0,
		currentSet: 1,
		setScores: [],
		serviceTeam: 'home',
		createdAt: new Date(),
		...overrides
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	updateSetMock.mockReturnValue({ where: updateWhereMock });
	updateWhereMock.mockReturnValue({ returning: updateReturningMock });
	insertValuesMock.mockReturnValue({ returning: insertReturningMock });
	selectChain.from.mockReturnValue(selectChain);
	selectChain.where.mockReturnValue(selectChain);
	selectChain.orderBy.mockReturnValue(selectChain);
	selectChain.limit.mockResolvedValue([]);
	autoFinishStaleMock.mockResolvedValue(undefined);
	getDefaultTemplateMock.mockResolvedValue(undefined);
});

describe('getOrgMatch', () => {
	it('getOrgMatch scopes the query to org and id', async () => {
		matchesFindFirstMock.mockResolvedValue(undefined);
		expect(await getOrgMatch('org-1', 7)).toBeNull();
		const { sql, params } = render(matchesFindFirstMock.mock.calls[0][0].where);
		expect(sql).toBe('("matches"."org_id" = $1 and "matches"."id" = $2)');
		expect(params).toEqual(['org-1', 7]);
	});

	it('returns the row when the match belongs to the org', async () => {
		const row = matchRow();
		matchesFindFirstMock.mockResolvedValue(row);
		expect(await getOrgMatch('org-1', 7)).toBe(row);
	});
});

describe('getClubName', () => {
	it('reads the clubName setting of the org', async () => {
		settingsFindFirstMock.mockResolvedValue({ orgId: 'org-1', key: 'clubName', value: 'VBC Thun' });
		expect(await getClubName('org-1')).toBe('VBC Thun');
		const { sql, params } = render(settingsFindFirstMock.mock.calls[0][0].where);
		expect(sql).toBe('("settings"."org_id" = $1 and "settings"."key" = $2)');
		expect(params).toEqual(['org-1', 'clubName']);
	});

	it('returns an empty string when the setting is missing', async () => {
		settingsFindFirstMock.mockResolvedValue(undefined);
		expect(await getClubName('org-1')).toBe('');
	});
});

describe('toMobileMatchItem', () => {
	it('maps a match row to the mobile item shape', () => {
		expect(toMobileMatchItem(matchRow() as never)).toEqual({
			id: 7,
			homeTeamName: 'VBC Home',
			guestTeamName: 'VBC Guest',
			scheduledAt: '2026-10-14T18:00:00.000Z',
			venue: 'Halle A',
			league: '2. Liga',
			status: 'upcoming'
		});
	});

	it('toMobileMatchItem maps a match without scheduledAt to null', () => {
		expect(toMobileMatchItem(matchRow({ scheduledAt: null, venue: null, league: null }) as never)).toMatchObject({
			scheduledAt: null,
			venue: null,
			league: null
		});
	});
});

describe('listMobileMatches', () => {
	it('runs autoFinishStale for the org before querying', async () => {
		await listMobileMatches('org-1', new Date('2026-10-14T12:00:00.000Z'));
		expect(autoFinishStaleMock).toHaveBeenCalledWith('org-1');
		expect(autoFinishStaleMock.mock.invocationCallOrder[0]).toBeLessThan(
			selectChain.where.mock.invocationCallOrder[0]
		);
	});

	it('listMobileMatches filters live plus upcoming from 12 hours ago, live first, limit 50', async () => {
		await listMobileMatches('org-1', new Date('2026-10-14T12:00:00.000Z'));
		const where = render(selectChain.where.mock.calls[0][0]);
		expect(where.sql).toBe(
			'("matches"."org_id" = $1 and ("matches"."status" = $2 or ("matches"."status" = $3 and ("matches"."scheduled_at" is null or "matches"."scheduled_at" >= $4))))'
		);
		expect(where.params).toEqual(['org-1', 'live', 'upcoming', '2026-10-14T00:00:00.000Z']);
		const order = selectChain.orderBy.mock.calls[0].map((s: SQL) => render(s).sql);
		expect(order).toEqual([
			`case when "matches"."status" = 'live' then 0 else 1 end`,
			'"matches"."scheduled_at" asc'
		]);
		expect(selectChain.limit).toHaveBeenCalledWith(50);
		expect(MOBILE_MATCH_LIMIT).toBe(50);
	});

	it('maps the rows to mobile items', async () => {
		selectChain.limit.mockResolvedValue([matchRow({ status: 'live' })]);
		const items = await listMobileMatches('org-1', new Date('2026-10-14T12:00:00.000Z'));
		expect(items).toEqual([
			{
				id: 7,
				homeTeamName: 'VBC Home',
				guestTeamName: 'VBC Guest',
				scheduledAt: '2026-10-14T18:00:00.000Z',
				venue: 'Halle A',
				league: '2. Liga',
				status: 'live'
			}
		]);
	});
});

describe('startMatch', () => {
	it('returns null and writes nothing for a match of another org', async () => {
		matchesFindFirstMock.mockResolvedValue(undefined);
		expect(await startMatch('org-1', 7)).toBeNull();
		expect(updateSetMock).not.toHaveBeenCalled();
	});

	it('sets live, applies the default template, creates the first score and emits', async () => {
		matchesFindFirstMock.mockResolvedValue(matchRow());
		getDefaultTemplateMock.mockResolvedValue({ id: 3 });
		const updated = matchRow({ status: 'live', designTemplateId: 3 });
		updateReturningMock.mockResolvedValue([updated]);
		scoresFindFirstMock.mockResolvedValue(undefined);
		insertReturningMock.mockResolvedValue([scoreRow()]);

		const result = await startMatch('org-1', 7);

		expect(updateSetMock).toHaveBeenCalledWith(
			expect.objectContaining({ status: 'live', designTemplateId: 3, overlayBg: '#000000' })
		);
		expect(render(updateWhereMock.mock.calls[0][0]).params).toEqual(['org-1', 7]);
		expect(insertValuesMock).toHaveBeenCalledWith({ matchId: 7 });
		expect(result?.match).toBe(updated);
		expect(result?.state.status).toBe('live');
		expect(emitMock).toHaveBeenCalledWith(7, { type: 'match', data: result?.state });
	});

	it('keeps an existing score and skips the template when one is assigned', async () => {
		matchesFindFirstMock.mockResolvedValue(matchRow({ designTemplateId: 5 }));
		updateReturningMock.mockResolvedValue([matchRow({ status: 'live', designTemplateId: 5 })]);
		scoresFindFirstMock.mockResolvedValue(scoreRow({ homePoints: 3 }));

		const result = await startMatch('org-1', 7);

		expect(getDefaultTemplateMock).not.toHaveBeenCalled();
		expect(insertValuesMock).not.toHaveBeenCalled();
		expect(result?.state.homePoints).toBe(3);
	});
});

describe('ensureControlToken', () => {
	it('ensureControlToken only writes when no token exists and the match is not finished', async () => {
		updateReturningMock.mockImplementation(async () => [
			{ controlToken: updateSetMock.mock.calls.at(-1)![0].controlToken }
		]);
		await ensureControlToken('org-1', 7);
		const { sql, params } = render(updateWhereMock.mock.calls[0][0]);
		expect(sql).toBe(
			'("matches"."org_id" = $1 and "matches"."id" = $2 and "matches"."control_token" is null and "matches"."status" <> $3)'
		);
		expect(params).toEqual(['org-1', 7, 'finished']);
	});

	it('ensureControlToken creates a token when none exists', async () => {
		updateReturningMock.mockImplementation(async () => [
			{ controlToken: updateSetMock.mock.calls.at(-1)![0].controlToken }
		]);
		const result = await ensureControlToken('org-1', 7);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.token).toMatch(UUID_RE);
		expect(matchesFindFirstMock).not.toHaveBeenCalled();
	});

	it('ensureControlToken returns the token written by a concurrent caller without writing again', async () => {
		updateReturningMock.mockResolvedValue([]);
		matchesFindFirstMock.mockResolvedValue(matchRow({ status: 'live', controlToken: 'tok-existing' }));
		expect(await ensureControlToken('org-1', 7)).toEqual({ ok: true, token: 'tok-existing' });
		expect(updateSetMock).toHaveBeenCalledTimes(1);
	});

	it('returns not_found for a match of another org', async () => {
		updateReturningMock.mockResolvedValue([]);
		matchesFindFirstMock.mockResolvedValue(undefined);
		expect(await ensureControlToken('org-1', 7)).toEqual({ ok: false, reason: 'not_found' });
	});

	it('returns finished for a finished match', async () => {
		updateReturningMock.mockResolvedValue([]);
		matchesFindFirstMock.mockResolvedValue(matchRow({ status: 'finished' }));
		expect(await ensureControlToken('org-1', 7)).toEqual({ ok: false, reason: 'finished' });
	});

	it('retries once when the token was cleared between write and read', async () => {
		updateReturningMock
			.mockResolvedValueOnce([])
			.mockImplementationOnce(async () => [{ controlToken: 'tok-second' }]);
		matchesFindFirstMock.mockResolvedValueOnce(matchRow({ status: 'live', controlToken: null }));
		expect(await ensureControlToken('org-1', 7)).toEqual({ ok: true, token: 'tok-second' });
		expect(updateSetMock).toHaveBeenCalledTimes(2);
	});
});

describe('renewControlToken', () => {
	it('renewControlToken writes only for the caller\'s org and not for finished matches', async () => {
		updateReturningMock.mockImplementation(async () => [
			{ controlToken: updateSetMock.mock.calls.at(-1)![0].controlToken }
		]);
		const result = await renewControlToken('org-1', 7);
		const { sql, params } = render(updateWhereMock.mock.calls[0][0]);
		expect(sql).toBe('("matches"."org_id" = $1 and "matches"."id" = $2 and "matches"."status" <> $3)');
		expect(params).toEqual(['org-1', 7, 'finished']);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.token).toMatch(UUID_RE);
	});

	it('returns a different token on every call', async () => {
		updateReturningMock.mockImplementation(async () => [
			{ controlToken: updateSetMock.mock.calls.at(-1)![0].controlToken }
		]);
		const first = await renewControlToken('org-1', 7);
		const second = await renewControlToken('org-1', 7);
		expect(first).not.toEqual(second);
	});

	it('returns finished for a finished match', async () => {
		updateReturningMock.mockResolvedValue([]);
		matchesFindFirstMock.mockResolvedValue(matchRow({ status: 'finished' }));
		expect(await renewControlToken('org-1', 7)).toEqual({ ok: false, reason: 'finished' });
	});

	it('returns not_found for a match of another org', async () => {
		updateReturningMock.mockResolvedValue([]);
		matchesFindFirstMock.mockResolvedValue(undefined);
		expect(await renewControlToken('org-1', 7)).toEqual({ ok: false, reason: 'not_found' });
	});
});
```

- [ ] **Step 2: Write the failing activate route test**

Create `src/routes/api/matches/[matchId]/activate/server.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const startMatchMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db/index.js', () => ({ db: {} }));
vi.mock('$lib/server/match-service', () => ({ startMatch: startMatchMock }));

const { POST } = await import('./+server.js');

function event(matchId: string) {
	return { params: { matchId }, locals: { orgId: 'org-1' } } as unknown as Parameters<typeof POST>[0];
}

describe('POST /api/matches/[matchId]/activate', () => {
	beforeEach(() => startMatchMock.mockReset());

	it('returns 404 when the match is not in the org', async () => {
		startMatchMock.mockResolvedValue(null);
		const response = await POST(event('7'));
		expect(response.status).toBe(404);
		expect(startMatchMock).toHaveBeenCalledWith('org-1', 7);
	});

	it('returns the started match state', async () => {
		startMatchMock.mockResolvedValue({ match: { id: 7 }, state: { matchId: 7, status: 'live' } });
		const response = await POST(event('7'));
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ matchId: 7, status: 'live' });
	});
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/lib/server/match-service.test.ts "src/routes/api/matches/[matchId]/activate"`
Expected: FAIL. `match-service.test.ts` fails to import `./match-service` (file does not exist); the activate test fails with `TypeError: Cannot read properties of undefined (reading 'matches')` because the old route still uses `db.query`.

- [ ] **Step 4: Implement match-service**

Create `src/lib/server/match-service.ts`:

```ts
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
```

- [ ] **Step 5: Refactor the activate route**

Replace the whole of `src/routes/api/matches/[matchId]/activate/+server.ts` (lines 1 to 52) with:

```ts
import { json } from '@sveltejs/kit';
import { startMatch } from '$lib/server/match-service';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ params, locals }) => {
	const started = await startMatch(locals.orgId, parseInt(params.matchId));
	if (!started) return json({ error: 'Match not found' }, { status: 404 });
	return json(started.state);
};
```

- [ ] **Step 6: Refactor the generateControlToken action**

In `src/routes/api/matches/[matchId]/+server.ts`, add after line 8 (`import { matchIdActionSchema, ... }`):

```ts
import { renewControlToken } from '$lib/server/match-service';
```

Replace lines 78 to 82:

```ts
			case 'generateControlToken': {
			const token = crypto.randomUUID();
			await db.update(matches).set({ controlToken: token, updatedAt: new Date() }).where(and(eq(matches.orgId, orgId), eq(matches.id, matchId)));
			return json({ controlToken: token });
		}
```

with:

```ts
			case 'generateControlToken': {
				const result = await renewControlToken(orgId, matchId);
				if (!result.ok) {
					return result.reason === 'finished'
						? json({ error: 'Match is finished' }, { status: 409 })
						: json({ error: 'Match not found' }, { status: 404 });
				}
				return json({ controlToken: result.token });
			}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run src/lib/server/match-service.test.ts "src/routes/api/matches/[matchId]/activate"`
Expected: PASS (all tests green).

Run: `npm test && npm run check`
Expected: all test files pass; `svelte-check found 0 errors`.

- [ ] **Step 8: Commit**

```bash
git add src/lib/server/match-service.ts src/lib/server/match-service.test.ts "src/routes/api/matches/[matchId]/activate/+server.ts" "src/routes/api/matches/[matchId]/activate/server.test.ts" "src/routes/api/matches/[matchId]/+server.ts"
git commit -m "refactor(matches): extract match-service for start, list and control token"
```

---

## Task 2: verifyMobileToken returns orgId, sub and roles

**Files:**
- Modify: `src/lib/server/mobile-auth.ts` (add after line 109; replace lines 121 to 134)
- Modify: `src/lib/server/mobile-auth.test.ts` (import lines 12 to 13; append new describe blocks at end of file)
- Modify: `src/routes/api/mobile/overlay-info/+server.ts` (lines 14 to 18)
- Modify: `src/routes/api/mobile/overlay-info/server.test.ts` (lines 61, 72, 82)
- Modify: `.env.example` (insert after line 12)
- Test: `npx vitest run src/lib/server/mobile-auth.test.ts src/routes/api/mobile/overlay-info`

**Interfaces:**
- Consumes: `resolveMobileOrgId(payload): Promise<string | null>` (same file).
- Produces:
  - `export interface MobileIdentity { orgId: string; sub: string; roles: string[]; }`
  - `export function extractRoles(payload: JWTPayload | Record<string, unknown>): string[]`
  - `export async function resolveMobileIdentity(payload: JWTPayload | Record<string, unknown>): Promise<MobileIdentity | null>`
  - `export async function verifyMobileToken(token: string): Promise<MobileIdentity | null>` (changed return type)

- [ ] **Step 1: Write the failing tests**

In `src/lib/server/mobile-auth.test.ts` replace lines 12 to 13:

```ts
const { extractOrgId, extractOrgAlias, validateMobilePayload, resolveMobileOrgId } =
	await import('./mobile-auth');
```

with:

```ts
const {
	extractOrgId,
	extractOrgAlias,
	validateMobilePayload,
	resolveMobileOrgId,
	extractRoles,
	resolveMobileIdentity
} = await import('./mobile-auth');
```

Append at the end of the file:

```ts
describe('extractRoles', () => {
	it('reads realm roles', () => {
		expect(extractRoles({ realm_access: { roles: ['admin', 'scorer'] } })).toEqual(['admin', 'scorer']);
	});

	it('drops non-string entries', () => {
		expect(extractRoles({ realm_access: { roles: ['admin', 42, null] } })).toEqual(['admin']);
	});

	it('returns an empty list without realm_access', () => {
		expect(extractRoles({ sub: 'user-1' })).toEqual([]);
	});
});

describe('resolveMobileIdentity', () => {
	beforeEach(() => {
		getKcOrgIdFromAliasMock.mockReset();
		getKcOrgIdForUserMock.mockReset();
		getKcOrgIdByScanningMembersMock.mockReset();
	});

	it('returns orgId, sub and roles for a valid mobile payload', async () => {
		expect(
			await resolveMobileIdentity({
				azp: MOBILE_CLIENT_ID,
				org_id: UUID,
				sub: 'user-1',
				realm_access: { roles: ['admin'] }
			})
		).toEqual({ orgId: UUID, sub: 'user-1', roles: ['admin'] });
	});

	it('returns null when azp is a different client', async () => {
		expect(await resolveMobileIdentity({ azp: 'scoring-app', org_id: UUID, sub: 'user-1' })).toBeNull();
	});

	it('returns null when no org can be resolved', async () => {
		getKcOrgIdFromAliasMock.mockResolvedValue(undefined);
		getKcOrgIdForUserMock.mockResolvedValue(undefined);
		getKcOrgIdByScanningMembersMock.mockResolvedValue(undefined);
		expect(await resolveMobileIdentity({ azp: MOBILE_CLIENT_ID, sub: 'user-z' })).toBeNull();
	});
});
```

In `src/routes/api/mobile/overlay-info/server.test.ts` replace each of the three lines 61, 72 and 82:

```ts
		verifyMobileTokenMock.mockResolvedValue('org-1');
```

with:

```ts
		verifyMobileTokenMock.mockResolvedValue({ orgId: 'org-1', sub: 'user-1', roles: [] });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/server/mobile-auth.test.ts src/routes/api/mobile/overlay-info`
Expected: FAIL. `extractRoles is not a function`, `resolveMobileIdentity is not a function`, and overlay-info `provisions the org slug so old orgs never get a 404` fails because `ensureOverlaySlug` is called with the identity object instead of `'org-1'`.

- [ ] **Step 3: Implement**

In `src/lib/server/mobile-auth.ts` insert after line 109 (end of `resolveMobileOrgId`):

```ts

export interface MobileIdentity {
	orgId: string;
	sub: string;
	roles: string[];
}

export function extractRoles(payload: JWTPayload | Record<string, unknown>): string[] {
	const realmAccess = (payload as Record<string, unknown>).realm_access as { roles?: unknown } | undefined;
	const roles = realmAccess?.roles;
	return Array.isArray(roles) ? roles.filter((role): role is string => typeof role === 'string') : [];
}

/** Org, subject and realm roles of a verified mobile token, so endpoints can check roles without re-parsing. */
export async function resolveMobileIdentity(
	payload: JWTPayload | Record<string, unknown>
): Promise<MobileIdentity | null> {
	const orgId = await resolveMobileOrgId(payload);
	if (!orgId) return null;
	const sub = (payload as Record<string, unknown>).sub;
	return { orgId, sub: typeof sub === 'string' ? sub : '', roles: extractRoles(payload) };
}
```

Replace lines 121 to 134 (`verifyMobileToken`) with:

```ts
export async function verifyMobileToken(token: string): Promise<MobileIdentity | null> {
	try {
		jwks ??= createRemoteJWKSet(
			new URL(`${env.KEYCLOAK_ISSUER}/protocol/openid-connect/certs`)
		);
		const { payload } = await jwtVerify(token, jwks, { issuer: env.KEYCLOAK_ISSUER });
		return resolveMobileIdentity(payload);
	} catch (e) {
		if (!isRoutineTokenError(e)) {
			console.error('[mobile-auth] verifyMobileToken failed:', e);
		}
		return null;
	}
}
```

In `src/routes/api/mobile/overlay-info/+server.ts` replace lines 14 to 18:

```ts
	const orgId = await verifyMobileToken(auth.slice('Bearer '.length));
	if (!orgId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}
	const slug = await ensureOverlaySlug(orgId);
```

with:

```ts
	const identity = await verifyMobileToken(auth.slice('Bearer '.length));
	if (!identity) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}
	const { orgId } = identity;
	const slug = await ensureOverlaySlug(orgId);
```

In `.env.example` insert after line 12 (`KEYCLOAK_ISSUER=...`):

```
# Keycloak client id of the Scorely Live app; bearer tokens on /api/mobile/* must have this azp
MOBILE_CLIENT_ID=scorely-mobile
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/server/mobile-auth.test.ts src/routes/api/mobile/overlay-info`
Expected: PASS.

Run: `npm run check`
Expected: `svelte-check found 0 errors`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/mobile-auth.ts src/lib/server/mobile-auth.test.ts src/routes/api/mobile/overlay-info/+server.ts src/routes/api/mobile/overlay-info/server.test.ts .env.example
git commit -m "feat(mobile-auth): return org, sub and roles from verifyMobileToken"
```

---

## Task 3: Security fixes for the control page and team match creation

**Files:**
- Modify: `src/routes/matches/[matchId]/control/+page.server.ts` (imports lines 1 to 8, match lookup lines 14 to 17)
- Create: `src/routes/matches/[matchId]/control/page.server.test.ts`
- Modify: `src/routes/api/teams/[teamId]/matches/+server.ts` (import line 3, POST lines 24 to 27)
- Create: `src/routes/api/teams/[teamId]/matches/server.test.ts`
- Test: `npx vitest run "src/routes/matches/[matchId]/control" "src/routes/api/teams/[teamId]/matches"`

**Interfaces:**
- Consumes: `getOrgMatch(orgId: string, matchId: number): Promise<MatchRow | null>` (Task 1), `teams` table (`$lib/server/db/schema.js`).
- Produces: no new exports. Control page load throws 404 for a match of another org; `POST /api/teams/{teamId}/matches` returns 404 `{ "error": "Team not found" }` for a team of another org.

- [ ] **Step 1: Write the failing tests**

Create `src/routes/matches/[matchId]/control/page.server.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getOrgMatchMock = vi.hoisted(() => vi.fn());
const matchesFindFirstMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db/index.js', () => ({
	db: { query: { matches: { findFirst: matchesFindFirstMock } } }
}));
vi.mock('$lib/server/match-service', () => ({ getOrgMatch: getOrgMatchMock }));
vi.mock('$lib/server/swiss-volley.js', () => ({ getUpcomingGames: vi.fn() }));
vi.mock('$lib/server/overlay-slug', () => ({ ensureOverlaySlug: vi.fn() }));

const { load } = await import('./+page.server.js');

function event(matchId: string) {
	return { params: { matchId }, locals: { orgId: 'org-1' } } as unknown as Parameters<typeof load>[0];
}

describe('control page load', () => {
	beforeEach(() => {
		getOrgMatchMock.mockReset();
		matchesFindFirstMock.mockReset();
		matchesFindFirstMock.mockResolvedValue({ id: 7, orgId: 'other-org' });
	});

	it('returns 404 for a match of another org', async () => {
		getOrgMatchMock.mockResolvedValue(null);
		await expect(load(event('7'))).rejects.toMatchObject({ status: 404 });
		expect(getOrgMatchMock).toHaveBeenCalledWith('org-1', 7);
	});
});
```

Create `src/routes/api/teams/[teamId]/matches/server.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';

const teamsFindFirstMock = vi.hoisted(() => vi.fn());
const insertValuesMock = vi.hoisted(() => vi.fn());
const insertReturningMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db/index.js', () => ({
	db: {
		query: { teams: { findFirst: teamsFindFirstMock } },
		insert: () => ({ values: insertValuesMock })
	}
}));
vi.mock('$lib/server/design-template.js', () => ({
	getDefaultTemplate: vi.fn().mockResolvedValue(undefined),
	templateToMatchColors: vi.fn()
}));
vi.mock('$lib/server/auto-finish.js', () => ({ autoFinishStale: vi.fn() }));
vi.mock('$lib/server/match-list.js', () => ({ toMatchListItems: vi.fn() }));

const { POST } = await import('./+server.js');

function event(teamId: string, body: unknown) {
	return {
		params: { teamId },
		locals: { orgId: 'org-1' },
		request: new Request(`http://localhost/api/teams/${teamId}/matches`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		})
	} as unknown as Parameters<typeof POST>[0];
}

describe('POST /api/teams/[teamId]/matches', () => {
	beforeEach(() => {
		teamsFindFirstMock.mockReset();
		insertValuesMock.mockReset();
		insertReturningMock.mockReset();
		insertValuesMock.mockReturnValue({ returning: insertReturningMock });
	});

	it('returns 404 and creates nothing for a team of another org', async () => {
		teamsFindFirstMock.mockResolvedValue(undefined);
		const response = await POST(event('3', { homeTeamName: 'A' }));
		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: 'Team not found' });
		expect(insertValuesMock).not.toHaveBeenCalled();
		const { params } = new PgDialect().sqlToQuery(teamsFindFirstMock.mock.calls[0][0].where);
		expect(params).toEqual(['org-1', 3]);
	});

	it('creates the match for a team of the org', async () => {
		teamsFindFirstMock.mockResolvedValue({ id: 3, orgId: 'org-1' });
		insertReturningMock.mockResolvedValue([{ id: 11, teamId: 3 }]);
		const response = await POST(event('3', { homeTeamName: 'A', guestTeamName: 'B' }));
		expect(response.status).toBe(201);
		expect(insertValuesMock).toHaveBeenCalledWith(
			expect.objectContaining({ orgId: 'org-1', teamId: 3, homeTeamName: 'A', guestTeamName: 'B' })
		);
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run "src/routes/matches/[matchId]/control" "src/routes/api/teams/[teamId]/matches"`
Expected: FAIL. Control page: `getOrgMatchMock` not called (old load uses `db.query.matches.findFirst` and continues). Team route: status 201 instead of 404 and `teamsFindFirstMock` not called.

- [ ] **Step 3: Implement**

In `src/routes/matches/[matchId]/control/+page.server.ts` insert after line 7 (`import { ensureOverlaySlug } ...`):

```ts
import { getOrgMatch } from '$lib/server/match-service';
```

Replace lines 14 to 17:

```ts
	let match = await db.query.matches.findFirst({
		where: eq(matches.id, matchId)
	});
	if (!match) error(404, 'Match not found');
```

with:

```ts
	let match = await getOrgMatch(orgId, matchId);
	if (!match) error(404, 'Match not found');
```

(`matches` and `eq` stay imported; they are still used by the logo update and score queries.)

In `src/routes/api/teams/[teamId]/matches/+server.ts` replace line 3:

```ts
import { matches } from '$lib/server/db/schema.js';
```

with:

```ts
import { matches, teams } from '$lib/server/db/schema.js';
```

Replace lines 24 to 27:

```ts
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const { orgId } = locals;
	const teamId = parseInt(params.teamId);
	const body = await request.json();
```

with:

```ts
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const { orgId } = locals;
	const teamId = parseInt(params.teamId);

	const team = await db.query.teams.findFirst({
		where: and(eq(teams.orgId, orgId), eq(teams.id, teamId))
	});
	if (!team) return json({ error: 'Team not found' }, { status: 404 });

	const body = await request.json();
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run "src/routes/matches/[matchId]/control" "src/routes/api/teams/[teamId]/matches"`
Expected: PASS.

Run: `npm run check`
Expected: `svelte-check found 0 errors`.

- [ ] **Step 5: Commit**

```bash
git add "src/routes/matches/[matchId]/control/+page.server.ts" "src/routes/matches/[matchId]/control/page.server.test.ts" "src/routes/api/teams/[teamId]/matches/+server.ts" "src/routes/api/teams/[teamId]/matches/server.test.ts"
git commit -m "fix(security): scope control page and team match creation to the caller's org"
```

---

## Task 4: GET /api/mobile/matches

**Files:**
- Create: `src/lib/server/mobile-api.ts`
- Create: `src/lib/server/mobile-api.test.ts`
- Create: `src/routes/api/mobile/matches/+server.ts`
- Create: `src/routes/api/mobile/matches/server.test.ts`
- Test: `npx vitest run src/lib/server/mobile-api.test.ts src/routes/api/mobile/matches/server.test.ts`

**Interfaces:**
- Consumes: `verifyMobileToken(token: string): Promise<MobileIdentity | null>` and `MobileIdentity` (Task 2), `listMobileMatches(orgId: string, now?: Date): Promise<MobileMatchItem[]>` and `getClubName(orgId: string): Promise<string>` (Task 1).
- Produces (`src/lib/server/mobile-api.ts`):
  - `export function mobileJson(body: unknown, status?: number): Response`
  - `export function unauthorized(): Response`
  - `export async function authenticateMobile(request: Request): Promise<MobileIdentity | null>`
- Produces (route): `GET /api/mobile/matches` returning `{ orgName: string, matches: MobileMatchItem[] }`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/server/mobile-api.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const verifyMobileTokenMock = vi.hoisted(() => vi.fn());
vi.mock('$lib/server/mobile-auth', () => ({ verifyMobileToken: verifyMobileTokenMock }));

const { mobileJson, unauthorized, authenticateMobile } = await import('./mobile-api');

function request(headers: Record<string, string>): Request {
	return new Request('http://localhost/api/mobile/matches', { headers });
}

describe('mobileJson', () => {
	it('sets Cache-Control no-store and the status', async () => {
		const response = mobileJson({ a: 1 }, 201);
		expect(response.status).toBe(201);
		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(await response.json()).toEqual({ a: 1 });
	});

	it('unauthorized is a 401 with the standard body', async () => {
		const response = unauthorized();
		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: 'Unauthorized' });
	});
});

describe('authenticateMobile', () => {
	beforeEach(() => verifyMobileTokenMock.mockReset());

	it('returns null without an Authorization header', async () => {
		expect(await authenticateMobile(request({}))).toBeNull();
		expect(verifyMobileTokenMock).not.toHaveBeenCalled();
	});

	it('returns null for a non-Bearer header', async () => {
		expect(await authenticateMobile(request({ authorization: 'Basic abc' }))).toBeNull();
		expect(verifyMobileTokenMock).not.toHaveBeenCalled();
	});

	it('passes the bearer token to verifyMobileToken', async () => {
		const identity = { orgId: 'org-1', sub: 'user-1', roles: [] };
		verifyMobileTokenMock.mockResolvedValue(identity);
		expect(await authenticateMobile(request({ authorization: 'Bearer tok' }))).toBe(identity);
		expect(verifyMobileTokenMock).toHaveBeenCalledWith('tok');
	});
});
```

Create `src/routes/api/mobile/matches/server.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const verifyMobileTokenMock = vi.hoisted(() => vi.fn());
const listMobileMatchesMock = vi.hoisted(() => vi.fn());
const getClubNameMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/mobile-auth', () => ({ verifyMobileToken: verifyMobileTokenMock }));
vi.mock('$lib/server/match-service', () => ({
	listMobileMatches: listMobileMatchesMock,
	getClubName: getClubNameMock
}));

const { GET } = await import('./+server.js');

const IDENTITY = { orgId: 'org-1', sub: 'user-1', roles: [] };

function event(headers: Record<string, string>) {
	return {
		request: new Request('http://localhost/api/mobile/matches', { headers })
	} as unknown as Parameters<typeof GET>[0];
}

describe('GET /api/mobile/matches', () => {
	beforeEach(() => {
		verifyMobileTokenMock.mockReset();
		listMobileMatchesMock.mockReset();
		getClubNameMock.mockReset();
	});

	it('returns 401 without Authorization header', async () => {
		const response = await GET(event({}));
		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: 'Unauthorized' });
		expect(listMobileMatchesMock).not.toHaveBeenCalled();
	});

	it('returns 401 when the token fails verification (e.g. wrong azp)', async () => {
		verifyMobileTokenMock.mockResolvedValue(null);
		const response = await GET(event({ authorization: 'Bearer web-client-token' }));
		expect(response.status).toBe(401);
		expect(listMobileMatchesMock).not.toHaveBeenCalled();
	});

	it('returns the club name and the org match list with no-store', async () => {
		verifyMobileTokenMock.mockResolvedValue(IDENTITY);
		const items = [
			{
				id: 7,
				homeTeamName: 'VBC Home',
				guestTeamName: 'VBC Guest',
				scheduledAt: '2026-10-14T18:00:00.000Z',
				venue: 'Halle A',
				league: '2. Liga',
				status: 'live'
			}
		];
		listMobileMatchesMock.mockResolvedValue(items);
		getClubNameMock.mockResolvedValue('VBC Thun');
		const response = await GET(event({ authorization: 'Bearer good' }));
		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(await response.json()).toEqual({ orgName: 'VBC Thun', matches: items });
		expect(listMobileMatchesMock).toHaveBeenCalledWith('org-1');
		expect(getClubNameMock).toHaveBeenCalledWith('org-1');
	});

	it('returns an empty list and an empty club name when nothing is set up', async () => {
		verifyMobileTokenMock.mockResolvedValue(IDENTITY);
		listMobileMatchesMock.mockResolvedValue([]);
		getClubNameMock.mockResolvedValue('');
		const response = await GET(event({ authorization: 'Bearer good' }));
		expect(await response.json()).toEqual({ orgName: '', matches: [] });
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/server/mobile-api.test.ts src/routes/api/mobile/matches/server.test.ts`
Expected: FAIL. Both files fail to import (`./mobile-api` and `./+server.js` do not exist).

- [ ] **Step 3: Implement**

Create `src/lib/server/mobile-api.ts`:

```ts
import { json } from '@sveltejs/kit';
import { verifyMobileToken, type MobileIdentity } from '$lib/server/mobile-auth';

export function mobileJson(body: unknown, status = 200): Response {
	return json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function unauthorized(): Response {
	return mobileJson({ error: 'Unauthorized' }, 401);
}

export async function authenticateMobile(request: Request): Promise<MobileIdentity | null> {
	const auth = request.headers.get('authorization');
	if (!auth?.startsWith('Bearer ')) return null;
	return verifyMobileToken(auth.slice('Bearer '.length));
}
```

Create `src/routes/api/mobile/matches/+server.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/server/mobile-api.test.ts src/routes/api/mobile/matches/server.test.ts`
Expected: PASS.

Run: `npm run check`
Expected: `svelte-check found 0 errors`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/mobile-api.ts src/lib/server/mobile-api.test.ts src/routes/api/mobile/matches/+server.ts src/routes/api/mobile/matches/server.test.ts
git commit -m "feat(mobile): list the org's live and upcoming matches for the app"
```

---

## Task 5: POST /api/mobile/matches/{id}/start

**Files:**
- Modify: `src/lib/server/mobile-api.ts` (append after `authenticateMobile`)
- Modify: `src/lib/server/mobile-api.test.ts` (import line; append describe)
- Create: `src/routes/api/mobile/matches/[matchId]/start/+server.ts`
- Create: `src/routes/api/mobile/matches/[matchId]/start/server.test.ts`
- Test: `npx vitest run src/lib/server/mobile-api.test.ts "src/routes/api/mobile/matches/[matchId]/start"`

**Interfaces:**
- Consumes: `authenticateMobile`, `mobileJson`, `unauthorized` (Task 4), `getOrgMatch`, `startMatch`, `toMobileMatchItem` (Task 1).
- Produces (`src/lib/server/mobile-api.ts`):
  - `export function notFound(): Response` (404 `{ error: 'Match not found' }`)
  - `export function finishedConflict(): Response` (409 `{ error: 'Match is finished' }`)
  - `export function parseMatchId(raw: string): number | null` (positive int4 or null)
- Produces (route): `POST /api/mobile/matches/{id}/start` returning `MobileMatchItem`.

- [ ] **Step 1: Write the failing tests**

In `src/lib/server/mobile-api.test.ts` replace:

```ts
const { mobileJson, unauthorized, authenticateMobile } = await import('./mobile-api');
```

with:

```ts
const { mobileJson, unauthorized, authenticateMobile, parseMatchId, notFound, finishedConflict } =
	await import('./mobile-api');
```

Append:

```ts
describe('parseMatchId', () => {
	it('accepts positive integers', () => {
		expect(parseMatchId('7')).toBe(7);
		expect(parseMatchId('2147483647')).toBe(2147483647);
	});

	it('rejects zero, signs, decimals, text and values beyond int4', () => {
		for (const raw of ['0', '-1', '+1', '1.5', 'abc', '', '2147483648', '99999999999']) {
			expect(parseMatchId(raw)).toBeNull();
		}
	});
});

describe('status responses', () => {
	it('notFound is a 404', async () => {
		const response = notFound();
		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: 'Match not found' });
	});

	it('finishedConflict is a 409', async () => {
		const response = finishedConflict();
		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({ error: 'Match is finished' });
	});
});
```

Create `src/routes/api/mobile/matches/[matchId]/start/server.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const verifyMobileTokenMock = vi.hoisted(() => vi.fn());
const getOrgMatchMock = vi.hoisted(() => vi.fn());
const startMatchMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db/index.js', () => ({ db: {} }));
vi.mock('$lib/server/mobile-auth', () => ({ verifyMobileToken: verifyMobileTokenMock }));
vi.mock('$lib/server/match-service', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/server/match-service')>()),
	getOrgMatch: getOrgMatchMock,
	startMatch: startMatchMock
}));

const { POST } = await import('./+server.js');

const IDENTITY = { orgId: 'org-1', sub: 'user-1', roles: [] };

function matchRow(overrides: Record<string, unknown> = {}) {
	return {
		id: 7,
		orgId: 'org-1',
		homeTeamName: 'VBC Home',
		guestTeamName: 'VBC Guest',
		scheduledAt: new Date('2026-10-14T18:00:00.000Z'),
		venue: 'Halle A',
		league: '2. Liga',
		status: 'upcoming',
		controlToken: null,
		...overrides
	};
}

function event(matchId: string, headers: Record<string, string> = { authorization: 'Bearer good' }) {
	return {
		params: { matchId },
		request: new Request(`https://scorely.ch/api/mobile/matches/${matchId}/start`, { method: 'POST', headers }),
		url: new URL(`https://scorely.ch/api/mobile/matches/${matchId}/start`)
	} as unknown as Parameters<typeof POST>[0];
}

describe('POST /api/mobile/matches/[matchId]/start', () => {
	beforeEach(() => {
		verifyMobileTokenMock.mockReset();
		getOrgMatchMock.mockReset();
		startMatchMock.mockReset();
		verifyMobileTokenMock.mockResolvedValue(IDENTITY);
	});

	it('returns 401 without Authorization header', async () => {
		const response = await POST(event('7', {}));
		expect(response.status).toBe(401);
		expect(getOrgMatchMock).not.toHaveBeenCalled();
	});

	it('returns 401 when the token fails verification (e.g. wrong azp)', async () => {
		verifyMobileTokenMock.mockResolvedValue(null);
		const response = await POST(event('7'));
		expect(response.status).toBe(401);
		expect(getOrgMatchMock).not.toHaveBeenCalled();
	});

	it('returns 404 for a malformed id without querying', async () => {
		const response = await POST(event('abc'));
		expect(response.status).toBe(404);
		expect(getOrgMatchMock).not.toHaveBeenCalled();
	});

	it('returns 404 for a match of another org', async () => {
		getOrgMatchMock.mockResolvedValue(null);
		const response = await POST(event('7'));
		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: 'Match not found' });
		expect(getOrgMatchMock).toHaveBeenCalledWith('org-1', 7);
		expect(startMatchMock).not.toHaveBeenCalled();
	});

	it('returns 409 for a finished match', async () => {
		getOrgMatchMock.mockResolvedValue(matchRow({ status: 'finished' }));
		const response = await POST(event('7'));
		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({ error: 'Match is finished' });
		expect(startMatchMock).not.toHaveBeenCalled();
	});

	it('is idempotent for a live match', async () => {
		getOrgMatchMock.mockResolvedValue(matchRow({ status: 'live' }));
		const response = await POST(event('7'));
		expect(response.status).toBe(200);
		expect((await response.json()).status).toBe('live');
		expect(startMatchMock).not.toHaveBeenCalled();
	});

	it('starts an upcoming match and returns the item', async () => {
		getOrgMatchMock.mockResolvedValue(matchRow());
		startMatchMock.mockResolvedValue({ match: matchRow({ status: 'live' }), state: {} });
		const response = await POST(event('7'));
		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(startMatchMock).toHaveBeenCalledWith('org-1', 7);
		expect(await response.json()).toEqual({
			id: 7,
			homeTeamName: 'VBC Home',
			guestTeamName: 'VBC Guest',
			scheduledAt: '2026-10-14T18:00:00.000Z',
			venue: 'Halle A',
			league: '2. Liga',
			status: 'live'
		});
	});

	it('returns 404 when the match disappears during start', async () => {
		getOrgMatchMock.mockResolvedValue(matchRow());
		startMatchMock.mockResolvedValue(null);
		const response = await POST(event('7'));
		expect(response.status).toBe(404);
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/server/mobile-api.test.ts "src/routes/api/mobile/matches/[matchId]/start"`
Expected: FAIL. `parseMatchId is not a function`, and the route test fails to import `./+server.js`.

- [ ] **Step 3: Implement**

Append to `src/lib/server/mobile-api.ts`:

```ts

const MAX_INT4 = 2_147_483_647;

export function notFound(): Response {
	return mobileJson({ error: 'Match not found' }, 404);
}

export function finishedConflict(): Response {
	return mobileJson({ error: 'Match is finished' }, 409);
}

/** Accepts only positive integers that fit the serial column, so bad input never reaches Postgres. */
export function parseMatchId(raw: string): number | null {
	if (!/^\d{1,10}$/.test(raw)) return null;
	const id = Number(raw);
	return id >= 1 && id <= MAX_INT4 ? id : null;
}
```

Create `src/routes/api/mobile/matches/[matchId]/start/+server.ts`:

```ts
import type { RequestHandler } from './$types.js';
import {
	authenticateMobile,
	finishedConflict,
	mobileJson,
	notFound,
	parseMatchId,
	unauthorized
} from '$lib/server/mobile-api';
import { getOrgMatch, startMatch, toMobileMatchItem } from '$lib/server/match-service';

export const POST: RequestHandler = async ({ request, params }) => {
	const identity = await authenticateMobile(request);
	if (!identity) return unauthorized();
	const matchId = parseMatchId(params.matchId);
	if (matchId === null) return notFound();

	const match = await getOrgMatch(identity.orgId, matchId);
	if (!match) return notFound();
	if (match.status === 'finished') return finishedConflict();
	if (match.status === 'live') return mobileJson(toMobileMatchItem(match));

	const started = await startMatch(identity.orgId, matchId);
	if (!started) return notFound();
	return mobileJson(toMobileMatchItem(started.match));
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/server/mobile-api.test.ts "src/routes/api/mobile/matches/[matchId]/start"`
Expected: PASS.

Run: `npm run check`
Expected: `svelte-check found 0 errors`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/mobile-api.ts src/lib/server/mobile-api.test.ts "src/routes/api/mobile/matches/[matchId]/start/+server.ts" "src/routes/api/mobile/matches/[matchId]/start/server.test.ts"
git commit -m "feat(mobile): start a match from the app"
```

---

## Task 6: POST share and share/renew

**Files:**
- Modify: `src/lib/server/mobile-api.ts` (import line; append share helpers)
- Modify: `src/lib/server/mobile-api.test.ts` (import line; append describe)
- Create: `src/routes/api/mobile/matches/[matchId]/share/+server.ts`
- Create: `src/routes/api/mobile/matches/[matchId]/share/server.test.ts`
- Create: `src/routes/api/mobile/matches/[matchId]/share/renew/+server.ts`
- Create: `src/routes/api/mobile/matches/[matchId]/share/renew/server.test.ts`
- Test: `npx vitest run src/lib/server/mobile-api.test.ts "src/routes/api/mobile/matches/[matchId]/share"`

**Interfaces:**
- Consumes: `authenticateMobile`, `parseMatchId`, `notFound`, `finishedConflict`, `mobileJson`, `unauthorized` (Tasks 4, 5), `ensureControlToken`, `renewControlToken`, `TokenResult` (Task 1).
- Produces (`src/lib/server/mobile-api.ts`):
  - `export interface ShareUrls { controlUrl: string; overlayUrl: string; }`
  - `export function shareUrls(origin: string, matchId: number, token: string): ShareUrls`
  - `export function shareResponse(result: TokenResult, origin: string, matchId: number): Response`
- Produces (routes): `POST /api/mobile/matches/{id}/share` and `POST /api/mobile/matches/{id}/share/renew` returning `ShareUrls`.

- [ ] **Step 1: Write the failing tests**

In `src/lib/server/mobile-api.test.ts` replace:

```ts
const { mobileJson, unauthorized, authenticateMobile, parseMatchId, notFound, finishedConflict } =
	await import('./mobile-api');
```

with:

```ts
const {
	mobileJson,
	unauthorized,
	authenticateMobile,
	parseMatchId,
	notFound,
	finishedConflict,
	shareUrls,
	shareResponse
} = await import('./mobile-api');
```

Append:

```ts
describe('share helpers', () => {
	it('builds the guest control and match overlay urls', () => {
		expect(shareUrls('https://scorely.ch', 7, 'tok-1')).toEqual({
			controlUrl: 'https://scorely.ch/c/tok-1',
			overlayUrl: 'https://scorely.ch/matches/7/overlay'
		});
	});

	it('maps token results to responses', async () => {
		const ok = shareResponse({ ok: true, token: 'tok-1' }, 'https://scorely.ch', 7);
		expect(ok.status).toBe(200);
		expect(ok.headers.get('cache-control')).toBe('no-store');
		expect(await ok.json()).toEqual({
			controlUrl: 'https://scorely.ch/c/tok-1',
			overlayUrl: 'https://scorely.ch/matches/7/overlay'
		});
		expect(shareResponse({ ok: false, reason: 'not_found' }, 'https://scorely.ch', 7).status).toBe(404);
		expect(shareResponse({ ok: false, reason: 'finished' }, 'https://scorely.ch', 7).status).toBe(409);
	});
});
```

Create `src/routes/api/mobile/matches/[matchId]/share/server.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const verifyMobileTokenMock = vi.hoisted(() => vi.fn());
const ensureControlTokenMock = vi.hoisted(() => vi.fn());
const renewControlTokenMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/mobile-auth', () => ({ verifyMobileToken: verifyMobileTokenMock }));
vi.mock('$lib/server/match-service', () => ({
	ensureControlToken: ensureControlTokenMock,
	renewControlToken: renewControlTokenMock
}));

const { POST } = await import('./+server.js');

const IDENTITY = { orgId: 'org-1', sub: 'user-1', roles: [] };

function event(matchId: string, headers: Record<string, string> = { authorization: 'Bearer good' }) {
	const url = `https://scorely.ch/api/mobile/matches/${matchId}/share`;
	return {
		params: { matchId },
		request: new Request(url, { method: 'POST', headers }),
		url: new URL(url)
	} as unknown as Parameters<typeof POST>[0];
}

describe('POST /api/mobile/matches/[matchId]/share', () => {
	beforeEach(() => {
		verifyMobileTokenMock.mockReset();
		ensureControlTokenMock.mockReset();
		renewControlTokenMock.mockReset();
		verifyMobileTokenMock.mockResolvedValue(IDENTITY);
	});

	it('returns 401 without Authorization header', async () => {
		const response = await POST(event('7', {}));
		expect(response.status).toBe(401);
		expect(ensureControlTokenMock).not.toHaveBeenCalled();
	});

	it('returns 401 when the token fails verification (e.g. wrong azp)', async () => {
		verifyMobileTokenMock.mockResolvedValue(null);
		const response = await POST(event('7'));
		expect(response.status).toBe(401);
		expect(ensureControlTokenMock).not.toHaveBeenCalled();
	});

	it('returns 404 for a malformed id', async () => {
		const response = await POST(event('7a'));
		expect(response.status).toBe(404);
		expect(ensureControlTokenMock).not.toHaveBeenCalled();
	});

	it('returns 404 for a match of another org', async () => {
		ensureControlTokenMock.mockResolvedValue({ ok: false, reason: 'not_found' });
		const response = await POST(event('7'));
		expect(response.status).toBe(404);
		expect(ensureControlTokenMock).toHaveBeenCalledWith('org-1', 7);
	});

	it('returns 409 for a finished match', async () => {
		ensureControlTokenMock.mockResolvedValue({ ok: false, reason: 'finished' });
		const response = await POST(event('7'));
		expect(response.status).toBe(409);
	});

	it('returns the same link on repeated share and never renews', async () => {
		ensureControlTokenMock.mockResolvedValue({ ok: true, token: 'tok-1' });
		const firstResponse = await POST(event('7'));
		expect(firstResponse.status).toBe(200);
		const first = await firstResponse.json();
		const second = await (await POST(event('7'))).json();
		expect(first).toEqual({
			controlUrl: 'https://scorely.ch/c/tok-1',
			overlayUrl: 'https://scorely.ch/matches/7/overlay'
		});
		expect(second).toEqual(first);
		expect(renewControlTokenMock).not.toHaveBeenCalled();
	});
});
```

Create `src/routes/api/mobile/matches/[matchId]/share/renew/server.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const verifyMobileTokenMock = vi.hoisted(() => vi.fn());
const ensureControlTokenMock = vi.hoisted(() => vi.fn());
const renewControlTokenMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/mobile-auth', () => ({ verifyMobileToken: verifyMobileTokenMock }));
vi.mock('$lib/server/match-service', () => ({
	ensureControlToken: ensureControlTokenMock,
	renewControlToken: renewControlTokenMock
}));

const { POST } = await import('./+server.js');

const IDENTITY = { orgId: 'org-1', sub: 'user-1', roles: [] };

function event(matchId: string, headers: Record<string, string> = { authorization: 'Bearer good' }) {
	const url = `https://scorely.ch/api/mobile/matches/${matchId}/share/renew`;
	return {
		params: { matchId },
		request: new Request(url, { method: 'POST', headers }),
		url: new URL(url)
	} as unknown as Parameters<typeof POST>[0];
}

describe('POST /api/mobile/matches/[matchId]/share/renew', () => {
	beforeEach(() => {
		verifyMobileTokenMock.mockReset();
		ensureControlTokenMock.mockReset();
		renewControlTokenMock.mockReset();
		verifyMobileTokenMock.mockResolvedValue(IDENTITY);
	});

	it('returns 401 without Authorization header', async () => {
		const response = await POST(event('7', {}));
		expect(response.status).toBe(401);
		expect(renewControlTokenMock).not.toHaveBeenCalled();
	});

	it('returns 401 when the token fails verification (e.g. wrong azp)', async () => {
		verifyMobileTokenMock.mockResolvedValue(null);
		const response = await POST(event('7'));
		expect(response.status).toBe(401);
		expect(renewControlTokenMock).not.toHaveBeenCalled();
	});

	it('returns 404 for a match of another org', async () => {
		renewControlTokenMock.mockResolvedValue({ ok: false, reason: 'not_found' });
		const response = await POST(event('7'));
		expect(response.status).toBe(404);
		expect(renewControlTokenMock).toHaveBeenCalledWith('org-1', 7);
	});

	it('returns 409 for a finished match', async () => {
		renewControlTokenMock.mockResolvedValue({ ok: false, reason: 'finished' });
		const response = await POST(event('7'));
		expect(response.status).toBe(409);
	});

	it('returns a link with the new token and never reuses', async () => {
		renewControlTokenMock.mockResolvedValue({ ok: true, token: 'tok-new' });
		const response = await POST(event('7'));
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			controlUrl: 'https://scorely.ch/c/tok-new',
			overlayUrl: 'https://scorely.ch/matches/7/overlay'
		});
		expect(ensureControlTokenMock).not.toHaveBeenCalled();
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/server/mobile-api.test.ts "src/routes/api/mobile/matches/[matchId]/share"`
Expected: FAIL. `shareUrls is not a function`, and both route tests fail to import `./+server.js`.

- [ ] **Step 3: Implement**

In `src/lib/server/mobile-api.ts` add after the `mobile-auth` import line:

```ts
import type { TokenResult } from '$lib/server/match-service';
```

Append:

```ts

export interface ShareUrls {
	controlUrl: string;
	overlayUrl: string;
}

export function shareUrls(origin: string, matchId: number, token: string): ShareUrls {
	return {
		controlUrl: `${origin}/c/${token}`,
		overlayUrl: `${origin}/matches/${matchId}/overlay`
	};
}

export function shareResponse(result: TokenResult, origin: string, matchId: number): Response {
	if (result.ok) return mobileJson(shareUrls(origin, matchId, result.token));
	return result.reason === 'finished' ? finishedConflict() : notFound();
}
```

Create `src/routes/api/mobile/matches/[matchId]/share/+server.ts`:

```ts
import type { RequestHandler } from './$types.js';
import { authenticateMobile, notFound, parseMatchId, shareResponse, unauthorized } from '$lib/server/mobile-api';
import { ensureControlToken } from '$lib/server/match-service';

export const POST: RequestHandler = async ({ request, params, url }) => {
	const identity = await authenticateMobile(request);
	if (!identity) return unauthorized();
	const matchId = parseMatchId(params.matchId);
	if (matchId === null) return notFound();
	return shareResponse(await ensureControlToken(identity.orgId, matchId), url.origin, matchId);
};
```

Create `src/routes/api/mobile/matches/[matchId]/share/renew/+server.ts`:

```ts
import type { RequestHandler } from './$types.js';
import { authenticateMobile, notFound, parseMatchId, shareResponse, unauthorized } from '$lib/server/mobile-api';
import { renewControlToken } from '$lib/server/match-service';

export const POST: RequestHandler = async ({ request, params, url }) => {
	const identity = await authenticateMobile(request);
	if (!identity) return unauthorized();
	const matchId = parseMatchId(params.matchId);
	if (matchId === null) return notFound();
	return shareResponse(await renewControlToken(identity.orgId, matchId), url.origin, matchId);
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/server/mobile-api.test.ts "src/routes/api/mobile/matches/[matchId]/share"`
Expected: PASS.

Run: `npm run check`
Expected: `svelte-check found 0 errors`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/mobile-api.ts src/lib/server/mobile-api.test.ts "src/routes/api/mobile/matches/[matchId]/share"
git commit -m "feat(mobile): share and renew the guest scorer link from the app"
```

---

## Task 7: Guest link expiry 10 minutes after finish

**Files:**
- Modify: `src/lib/server/db/schema.ts` (insert after line 46, `controlToken: text('control_token'),`)
- Create (generated): `drizzle/0008_match_finished_at.sql`, `drizzle/meta/0008_snapshot.json`
- Modify (generated): `drizzle/meta/_journal.json`
- Modify: `src/lib/server/auto-finish.ts` (whole file, lines 1 to 19)
- Create: `src/lib/server/auto-finish.test.ts`
- Modify: `src/lib/server/match-service.ts` (auto-finish import line; append `statusChange`, `isGuestLinkExpired`, `expireGuestLink`)
- Modify: `src/lib/server/match-service.test.ts` (auto-finish mock; import; append describes)
- Modify: `src/routes/api/c/[controlToken]/+server.ts` (import after line 7; lines 19 to 22; lines 71 and 82)
- Create: `src/routes/api/c/[controlToken]/server.test.ts`
- Modify: `src/routes/api/c/[controlToken]/timeout/+server.ts` (import after line 5; lookups originally lines 16 to 19 and 60 to 63)
- Create: `src/routes/api/c/[controlToken]/timeout/server.test.ts`
- Modify: `src/routes/api/matches/[matchId]/+server.ts` (two status writes, originally lines 96 and 107)
- Modify: `src/routes/api/match/+server.ts` (import after line 7; lines 137 and 149)
- Modify: `src/routes/c/[controlToken]/+page.server.ts` (import after line 5; line 14)
- Create: `src/routes/c/[controlToken]/page.server.test.ts`
- Create: `src/routes/c/[controlToken]/+error.svelte`
- Modify: `src/routes/c/[controlToken]/+page.svelte` (lines 39 to 42, inside `api()`)
- Test: `npx vitest run src/lib/server/match-service.test.ts src/lib/server/auto-finish.test.ts "src/routes/api/c" "src/routes/c"`

**Interfaces:**
- Consumes: `MatchStatus` (`$lib/types.js`), `MatchRow` (Task 1).
- Produces:
  - Column `matches.finishedAt` (`finished_at timestamp`, nullable), so `MatchRow.finishedAt: Date | null`.
  - `export const GUEST_LINK_GRACE_MS = 10 * 60 * 1000;` in `src/lib/server/auto-finish.ts`.
  - `export async function autoFinishStale(orgId: string, now?: Date): Promise<void>` (optional `now` added; existing callers unchanged).
  - `export function statusChange(status: MatchStatus, now?: Date): { status: MatchStatus; updatedAt: Date; finishedAt: Date | null }` in `src/lib/server/match-service.ts`.
  - `export function isGuestLinkExpired(match: Pick<MatchRow, 'status' | 'finishedAt'>, now?: Date): boolean` in `src/lib/server/match-service.ts`.
  - `export async function expireGuestLink(matchId: number): Promise<void>` in `src/lib/server/match-service.ts`.
  - Guest API answers 410 `{ "error": "Link expired" }` and the guest page throws 410 once the grace period is over.

Note: `GUEST_LINK_GRACE_MS` lives in `auto-finish.ts` because `match-service.ts` already imports `auto-finish.ts`; defining it in `match-service.ts` would create an import cycle. Finished matches from before this deploy have `finished_at` null and count as expired, so no data migration is needed; their token is cleared on the next guest access or `autoFinishStale` run. Once the token is cleared, `/c/{old}` is a 404, which the new error page renders with the same friendly text.

Deploy note: the production container runs `node migrate.mjs` before `node build` (Dockerfile `CMD`), so 0008 applies on deploy. If a deployment does not run it (see `drizzle/0007_README.md`), run `psql "$DATABASE_URL" -f drizzle/0008_match_finished_at.sql` before the new code starts. The SQL uses `IF NOT EXISTS` (same convention as 0007), so both paths can apply it.

- [ ] **Step 1: Add the column and generate the migration**

In `src/lib/server/db/schema.ts` replace line 46:

```ts
	controlToken: text('control_token'),
```

with:

```ts
	controlToken: text('control_token'),
	finishedAt: timestamp('finished_at'),
```

Run: `npx drizzle-kit generate --name match_finished_at`
Expected: `[✓] Your SQL migration file ➜ drizzle/0008_match_finished_at.sql`; `drizzle/meta/_journal.json` gains an entry with `"idx": 8` and `"tag": "0008_match_finished_at"`; `drizzle/meta/0008_snapshot.json` is created. The generated SQL is exactly:

```sql
ALTER TABLE "matches" ADD COLUMN "finished_at" timestamp;
```

If the file contains any other statement, stop: the snapshots have drifted from the schema and must be fixed first.

Replace the whole content of `drizzle/0008_match_finished_at.sql` with:

```sql
-- Start of the guest link grace period: set when a match becomes finished, cleared on undo back to live.
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "finished_at" timestamp;
```

Apply it to the local database:

Run: `docker compose exec -T postgres psql -U scoring -d scoring < drizzle/0008_match_finished_at.sql`
Expected: `ALTER TABLE`.

Run: `docker compose exec -T postgres psql -U scoring -d scoring -c '\d matches' | grep finished_at`
Expected: `finished_at | timestamp without time zone |` (one line).

Run: `npm run check`
Expected: `svelte-check found 0 errors`.

- [ ] **Step 2: Write the failing tests**

In `src/lib/server/match-service.test.ts` replace:

```ts
vi.mock('$lib/server/auto-finish.js', () => ({ autoFinishStale: autoFinishStaleMock }));
```

with:

```ts
vi.mock('$lib/server/auto-finish.js', () => ({
	autoFinishStale: autoFinishStaleMock,
	GUEST_LINK_GRACE_MS: 10 * 60 * 1000
}));
```

Replace:

```ts
const {
	getOrgMatch,
	getClubName,
	toMobileMatchItem,
	listMobileMatches,
	startMatch,
	ensureControlToken,
	renewControlToken,
	MOBILE_MATCH_LIMIT
} = await import('./match-service');
```

with:

```ts
const {
	getOrgMatch,
	getClubName,
	toMobileMatchItem,
	listMobileMatches,
	startMatch,
	ensureControlToken,
	renewControlToken,
	statusChange,
	isGuestLinkExpired,
	expireGuestLink,
	MOBILE_MATCH_LIMIT
} = await import('./match-service');
```

Append:

```ts
describe('statusChange', () => {
	const now = new Date('2026-10-14T20:00:00.000Z');

	it('statusChange stamps finishedAt for finished and clears it for any other status', () => {
		expect(statusChange('finished', now)).toEqual({ status: 'finished', updatedAt: now, finishedAt: now });
		expect(statusChange('live', now)).toEqual({ status: 'live', updatedAt: now, finishedAt: null });
		expect(statusChange('upcoming', now)).toEqual({ status: 'upcoming', updatedAt: now, finishedAt: null });
	});

	it('never touches the control token', () => {
		expect('controlToken' in statusChange('finished')).toBe(false);
		expect('controlToken' in statusChange('live')).toBe(false);
	});
});

describe('isGuestLinkExpired', () => {
	const now = new Date('2026-10-14T20:00:00.000Z');
	const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60 * 1000);

	it('isGuestLinkExpired keeps the link of live and upcoming matches', () => {
		expect(isGuestLinkExpired({ status: 'live', finishedAt: null }, now)).toBe(false);
		expect(isGuestLinkExpired({ status: 'upcoming', finishedAt: null }, now)).toBe(false);
	});

	it('isGuestLinkExpired keeps the link within 10 minutes after the finish', () => {
		expect(isGuestLinkExpired({ status: 'finished', finishedAt: minutesAgo(9) }, now)).toBe(false);
	});

	it('isGuestLinkExpired expires the link at exactly 10 minutes', () => {
		expect(isGuestLinkExpired({ status: 'finished', finishedAt: minutesAgo(10) }, now)).toBe(true);
	});

	it('isGuestLinkExpired expires finished matches without finishedAt (finished before the column existed)', () => {
		expect(isGuestLinkExpired({ status: 'finished', finishedAt: null }, now)).toBe(true);
	});
});

describe('expireGuestLink', () => {
	it('clears the token only while the match is still finished', async () => {
		await expireGuestLink(7);
		expect(updateSetMock).toHaveBeenCalledWith({ controlToken: null });
		const { sql, params } = render(updateWhereMock.mock.calls[0][0]);
		expect(sql).toBe('("matches"."id" = $1 and "matches"."status" = $2)');
		expect(params).toEqual([7, 'finished']);
	});
});
```

Create `src/lib/server/auto-finish.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';

const updateSetMock = vi.hoisted(() => vi.fn());
const updateWhereMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db/index.js', () => ({
	db: { update: () => ({ set: updateSetMock }) }
}));

const { autoFinishStale, GUEST_LINK_GRACE_MS } = await import('./auto-finish');

const dialect = new PgDialect();
const now = new Date('2026-10-14T20:00:00.000Z');

describe('autoFinishStale', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		updateSetMock.mockReturnValue({ where: updateWhereMock });
		updateWhereMock.mockResolvedValue(undefined);
	});

	it('finishes stale live matches and stamps finishedAt without touching the token', async () => {
		await autoFinishStale('org-1', now);
		expect(updateSetMock.mock.calls[0][0]).toEqual({ status: 'finished', finishedAt: now, updatedAt: now });
		const { sql, params } = dialect.sqlToQuery(updateWhereMock.mock.calls[0][0]);
		expect(sql).toBe(
			'("matches"."org_id" = $1 and "matches"."status" = $2 and "matches"."scheduled_at" is not null and "matches"."scheduled_at" < $3)'
		);
		expect(params).toEqual(['org-1', 'live', '2026-10-12T20:00:00.000Z']);
	});

	it('clears the tokens of matches finished longer than the grace period', async () => {
		await autoFinishStale('org-1', now);
		expect(updateSetMock.mock.calls[1][0]).toEqual({ controlToken: null });
		const { sql, params } = dialect.sqlToQuery(updateWhereMock.mock.calls[1][0]);
		expect(sql).toBe(
			'("matches"."org_id" = $1 and "matches"."status" = $2 and "matches"."control_token" is not null and ("matches"."finished_at" is null or "matches"."finished_at" < $3))'
		);
		expect(params).toEqual(['org-1', 'finished', '2026-10-14T19:50:00.000Z']);
		expect(GUEST_LINK_GRACE_MS).toBe(10 * 60 * 1000);
	});
});
```

Create `src/routes/api/c/[controlToken]/server.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const matchesFindFirstMock = vi.hoisted(() => vi.fn());
const scoresFindFirstMock = vi.hoisted(() => vi.fn());
const scoresFindManyMock = vi.hoisted(() => vi.fn());
const updateSetMock = vi.hoisted(() => vi.fn());
const insertValuesMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db/index.js', () => ({
	db: {
		query: {
			matches: { findFirst: matchesFindFirstMock },
			scores: { findFirst: scoresFindFirstMock, findMany: scoresFindManyMock }
		},
		update: () => ({ set: updateSetMock }),
		insert: () => ({ values: insertValuesMock }),
		delete: () => ({ where: vi.fn() })
	}
}));
vi.mock('$lib/server/sse.js', () => ({ matchSSEEmitter: { emit: vi.fn() } }));

const { PUT } = await import('./+server.js');

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000);

function event(body: unknown) {
	return {
		params: { controlToken: 'tok-1' },
		request: new Request('http://localhost/api/c/tok-1', {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		})
	} as unknown as Parameters<typeof PUT>[0];
}

function matchRow(overrides: Record<string, unknown> = {}) {
	return {
		id: 7,
		orgId: 'org-1',
		status: 'live',
		controlToken: 'tok-1',
		finishedAt: null,
		homeTeamName: 'Home',
		guestTeamName: 'Guest',
		...overrides
	};
}

function scoreRow(overrides: Record<string, unknown> = {}) {
	return {
		id: 1,
		matchId: 7,
		homePoints: 0,
		guestPoints: 0,
		homeSets: 0,
		guestSets: 0,
		currentSet: 1,
		setScores: [],
		serviceTeam: 'home',
		createdAt: new Date(),
		...overrides
	};
}

describe('PUT /api/c/[controlToken]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		updateSetMock.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
		insertValuesMock.mockResolvedValue(undefined);
	});

	it('returns 410 after the grace period and clears the token', async () => {
		matchesFindFirstMock.mockResolvedValue(matchRow({ status: 'finished', finishedAt: minutesAgo(11) }));
		const response = await PUT(event({ action: 'addPoint', team: 'home' }));
		expect(response.status).toBe(410);
		expect(await response.json()).toEqual({ error: 'Link expired' });
		expect(updateSetMock).toHaveBeenCalledTimes(1);
		expect(updateSetMock).toHaveBeenCalledWith({ controlToken: null });
		expect(insertValuesMock).not.toHaveBeenCalled();
	});

	it('returns 410 for a match finished before finishedAt existed', async () => {
		matchesFindFirstMock.mockResolvedValue(matchRow({ status: 'finished', finishedAt: null }));
		const response = await PUT(event({ action: 'undo' }));
		expect(response.status).toBe(410);
		expect(scoresFindManyMock).not.toHaveBeenCalled();
	});

	it('returns 404 for an unknown token', async () => {
		matchesFindFirstMock.mockResolvedValue(undefined);
		const response = await PUT(event({ action: 'addPoint', team: 'home' }));
		expect(response.status).toBe(404);
	});

	it('stamps finishedAt and keeps the token when the match point finishes the match', async () => {
		matchesFindFirstMock.mockResolvedValue(matchRow());
		scoresFindFirstMock.mockResolvedValue(
			scoreRow({
				homePoints: 24,
				guestPoints: 10,
				homeSets: 2,
				currentSet: 3,
				setScores: [
					{ home: 25, guest: 10 },
					{ home: 25, guest: 10 }
				]
			})
		);
		const response = await PUT(event({ action: 'addPoint', team: 'home' }));
		expect(response.status).toBe(200);
		expect((await response.json()).status).toBe('finished');
		expect(updateSetMock).toHaveBeenCalledWith({
			status: 'finished',
			updatedAt: expect.any(Date),
			finishedAt: expect.any(Date)
		});
	});

	it('allows the guest to undo the final point within the grace period', async () => {
		matchesFindFirstMock.mockResolvedValue(matchRow({ status: 'finished', finishedAt: minutesAgo(2) }));
		const finalScore = scoreRow({ id: 2, homeSets: 3, currentSet: 3 });
		const beforeFinal = scoreRow({ id: 1, homePoints: 24, guestPoints: 10, homeSets: 2, currentSet: 3 });
		scoresFindFirstMock.mockResolvedValue(finalScore);
		scoresFindManyMock.mockResolvedValue([finalScore, beforeFinal]);
		const response = await PUT(event({ action: 'undo' }));
		expect(response.status).toBe(200);
		expect((await response.json()).status).toBe('live');
		expect(updateSetMock).toHaveBeenCalledTimes(1);
		expect(updateSetMock).toHaveBeenCalledWith({ status: 'live', updatedAt: expect.any(Date), finishedAt: null });
	});

	it('keeps the token for a normal point', async () => {
		matchesFindFirstMock.mockResolvedValue(matchRow());
		scoresFindFirstMock.mockResolvedValue(scoreRow({ homePoints: 3 }));
		const response = await PUT(event({ action: 'addPoint', team: 'home' }));
		expect(response.status).toBe(200);
		expect(updateSetMock).not.toHaveBeenCalled();
		expect(insertValuesMock).toHaveBeenCalled();
	});
});
```

Create `src/routes/api/c/[controlToken]/timeout/server.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const matchesFindFirstMock = vi.hoisted(() => vi.fn());
const insertValuesMock = vi.hoisted(() => vi.fn());
const updateSetMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db/index.js', () => ({
	db: {
		query: {
			matches: { findFirst: matchesFindFirstMock },
			scores: { findFirst: vi.fn() },
			timeouts: { findFirst: vi.fn(), findMany: vi.fn() }
		},
		update: () => ({ set: updateSetMock }),
		insert: () => ({ values: insertValuesMock }),
		delete: () => ({ where: vi.fn() })
	}
}));
vi.mock('$lib/server/sse.js', () => ({ matchSSEEmitter: { emit: vi.fn() } }));

const { POST, DELETE } = await import('./+server.js');

function event(method: string) {
	return {
		params: { controlToken: 'tok-1' },
		request: new Request('http://localhost/api/c/tok-1/timeout', {
			method,
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ team: 'home' })
		})
	} as unknown as Parameters<typeof POST>[0];
}

describe('/api/c/[controlToken]/timeout', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		updateSetMock.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
		matchesFindFirstMock.mockResolvedValue({
			id: 7,
			status: 'finished',
			finishedAt: new Date(Date.now() - 11 * 60 * 1000),
			controlToken: 'tok-1'
		});
	});

	it('POST returns 410 after the grace period and clears the token', async () => {
		const response = await POST(event('POST'));
		expect(response.status).toBe(410);
		expect(updateSetMock).toHaveBeenCalledWith({ controlToken: null });
		expect(insertValuesMock).not.toHaveBeenCalled();
	});

	it('DELETE returns 410 after the grace period', async () => {
		const response = await DELETE(event('DELETE'));
		expect(response.status).toBe(410);
	});
});
```

Create `src/routes/c/[controlToken]/page.server.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const matchesFindFirstMock = vi.hoisted(() => vi.fn());
const scoresFindFirstMock = vi.hoisted(() => vi.fn());
const updateSetMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db/index.js', () => ({
	db: {
		query: {
			matches: { findFirst: matchesFindFirstMock },
			scores: { findFirst: scoresFindFirstMock, findMany: vi.fn().mockResolvedValue([]) },
			timeouts: { findMany: vi.fn().mockResolvedValue([]) }
		},
		update: () => ({ set: updateSetMock })
	}
}));
vi.mock('$lib/server/sse.js', () => ({ matchSSEEmitter: { emit: vi.fn() } }));

const { load } = await import('./+page.server.js');

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000);

function event() {
	return { params: { controlToken: 'tok-1' } } as unknown as Parameters<typeof load>[0];
}

describe('/c/[controlToken] load', () => {
	beforeEach(() => {
		matchesFindFirstMock.mockReset();
		scoresFindFirstMock.mockReset();
		updateSetMock.mockReset();
		updateSetMock.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
	});

	it('returns 404 for an unknown or replaced token', async () => {
		matchesFindFirstMock.mockResolvedValue(undefined);
		await expect(load(event())).rejects.toMatchObject({ status: 404 });
	});

	it('returns 410 after the grace period and clears the token', async () => {
		matchesFindFirstMock.mockResolvedValue({ id: 7, status: 'finished', finishedAt: minutesAgo(11), controlToken: 'tok-1' });
		await expect(load(event())).rejects.toMatchObject({ status: 410 });
		expect(updateSetMock).toHaveBeenCalledWith({ controlToken: null });
	});

	it('still loads a finished match within the grace period so the guest can undo', async () => {
		matchesFindFirstMock.mockResolvedValue({ id: 7, status: 'finished', finishedAt: minutesAgo(1), controlToken: 'tok-1' });
		scoresFindFirstMock.mockResolvedValue({ id: 2, matchId: 7, homePoints: 0, guestPoints: 0, homeSets: 3, guestSets: 0, currentSet: 3, setScores: [], serviceTeam: 'home' });
		expect(await load(event())).toMatchObject({ controlToken: 'tok-1', activeMatch: { status: 'finished' } });
		expect(updateSetMock).not.toHaveBeenCalled();
	});
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/lib/server/match-service.test.ts src/lib/server/auto-finish.test.ts "src/routes/api/c" "src/routes/c"`
Expected: FAIL. `statusChange is not a function` (and the same for `isGuestLinkExpired`, `expireGuestLink`); auto-finish sets no `finishedAt` and runs only one update (`updateSetMock.mock.calls[1]` is undefined); `/api/c` processes expired matches (200 or 400, not 410) and the finishing write lacks `finishedAt`; timeout routes return a non-410 status; `/c` load does not throw 410.

- [ ] **Step 4: Implement**

Replace the whole content of `src/lib/server/auto-finish.ts` (lines 1 to 19) with:

```ts
import { db } from '$lib/server/db/index.js';
import { matches } from '$lib/server/db/schema.js';
import { and, eq, isNotNull, isNull, lt, or } from 'drizzle-orm';

/** How long a guest scorer link keeps working after the match finished, so a wrong final point can be undone. */
export const GUEST_LINK_GRACE_MS = 10 * 60 * 1000;
const STALE_LIVE_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * Sets live matches to finished if scheduledAt is > 2 days ago, and clears the guest link of
 * matches finished longer than the grace period.
 */
export async function autoFinishStale(orgId: string, now: Date = new Date()): Promise<void> {
	await db
		.update(matches)
		.set({ status: 'finished', finishedAt: now, updatedAt: now })
		.where(
			and(
				eq(matches.orgId, orgId),
				eq(matches.status, 'live'),
				isNotNull(matches.scheduledAt),
				lt(matches.scheduledAt, new Date(now.getTime() - STALE_LIVE_MS))
			)
		);
	await db
		.update(matches)
		.set({ controlToken: null })
		.where(
			and(
				eq(matches.orgId, orgId),
				eq(matches.status, 'finished'),
				isNotNull(matches.controlToken),
				or(isNull(matches.finishedAt), lt(matches.finishedAt, new Date(now.getTime() - GUEST_LINK_GRACE_MS)))
			)
		);
}
```

In `src/lib/server/match-service.ts` replace:

```ts
import { autoFinishStale } from '$lib/server/auto-finish.js';
```

with:

```ts
import { autoFinishStale, GUEST_LINK_GRACE_MS } from '$lib/server/auto-finish.js';
```

Append to `src/lib/server/match-service.ts`:

```ts

/**
 * Column values for a status change. Finishing stamps finishedAt (start of the guest link grace
 * period); any other status, e.g. undo back to live, clears it. The control token is never touched.
 */
export function statusChange(
	status: MatchStatus,
	now: Date = new Date()
): { status: MatchStatus; updatedAt: Date; finishedAt: Date | null } {
	return { status, updatedAt: now, finishedAt: status === 'finished' ? now : null };
}

/** True once a finished match is past the grace period; finished rows without finishedAt predate the column. */
export function isGuestLinkExpired(
	match: Pick<MatchRow, 'status' | 'finishedAt'>,
	now: Date = new Date()
): boolean {
	if (match.status !== 'finished') return false;
	if (!match.finishedAt) return true;
	return now.getTime() - match.finishedAt.getTime() >= GUEST_LINK_GRACE_MS;
}

/** Clears the guest token of an expired match; the status guard skips a match that was undone meanwhile. */
export async function expireGuestLink(matchId: number): Promise<void> {
	await db
		.update(matches)
		.set({ controlToken: null })
		.where(and(eq(matches.id, matchId), eq(matches.status, 'finished')));
}
```

In `src/routes/api/c/[controlToken]/+server.ts` insert after line 7 (`import { controlActionSchema } ...`):

```ts
import { expireGuestLink, isGuestLinkExpired, statusChange } from '$lib/server/match-service';
```

Replace lines 19 to 22:

```ts
	const match = await db.query.matches.findFirst({
		where: eq(matches.controlToken, controlToken)
	});
	if (!match) return json({ error: 'Match not found' }, { status: 404 });
```

with:

```ts
	const match = await db.query.matches.findFirst({
		where: eq(matches.controlToken, controlToken)
	});
	if (!match) return json({ error: 'Match not found' }, { status: 404 });
	if (isGuestLinkExpired(match)) {
		await expireGuestLink(match.id);
		return json({ error: 'Link expired' }, { status: 410 });
	}
```

Replace line 71 (undo branch):

```ts
				await db.update(matches).set({ status: correctStatus, updatedAt: new Date() }).where(eq(matches.id, matchId));
```

with:

```ts
				await db.update(matches).set(statusChange(correctStatus)).where(eq(matches.id, matchId));
```

Replace line 82:

```ts
		await db.update(matches).set({ status: newState.status, updatedAt: new Date() }).where(eq(matches.id, matchId));
```

with:

```ts
		await db.update(matches).set(statusChange(newState.status)).where(eq(matches.id, matchId));
```

In `src/routes/api/c/[controlToken]/timeout/+server.ts` insert after line 5 (`import { controlTimeoutSchema } ...`):

```ts
import { expireGuestLink, isGuestLinkExpired } from '$lib/server/match-service';
```

Replace both occurrences (originally lines 16 to 19 in `POST`, lines 60 to 63 in `DELETE`) of:

```ts
	const match = await db.query.matches.findFirst({
		where: eq(matches.controlToken, controlToken)
	});
	if (!match) return json({ error: 'Match not found' }, { status: 404 });
```

with:

```ts
	const match = await db.query.matches.findFirst({
		where: eq(matches.controlToken, controlToken)
	});
	if (!match) return json({ error: 'Match not found' }, { status: 404 });
	if (isGuestLinkExpired(match)) {
		await expireGuestLink(match.id);
		return json({ error: 'Link expired' }, { status: 410 });
	}
```

In `src/routes/api/matches/[matchId]/+server.ts` extend the Task 1 import:

```ts
import { renewControlToken } from '$lib/server/match-service';
```

to:

```ts
import { renewControlToken, statusChange } from '$lib/server/match-service';
```

Replace the undo branch write (originally line 96):

```ts
					await db.update(matches).set({ status: correctStatus, updatedAt: new Date() }).where(eq(matches.id, matchId));
```

with:

```ts
					await db.update(matches).set(statusChange(correctStatus)).where(eq(matches.id, matchId));
```

Replace the status write after the switch (originally line 107):

```ts
			await db.update(matches).set({ status: newState.status, updatedAt: new Date() }).where(eq(matches.id, matchId));
```

with:

```ts
			await db.update(matches).set(statusChange(newState.status)).where(eq(matches.id, matchId));
```

In `src/routes/api/match/+server.ts` insert after line 7 (`import { matchCreateSchema, ... }`):

```ts
import { statusChange } from '$lib/server/match-service';
```

Replace line 137:

```ts
					await db.update(matches).set({ status: correctStatus, updatedAt: new Date() }).where(eq(matches.id, matchId));
```

with:

```ts
					await db.update(matches).set(statusChange(correctStatus)).where(eq(matches.id, matchId));
```

Replace line 149:

```ts
				await db.update(matches).set({ status: newState.status, updatedAt: new Date() }).where(eq(matches.id, matchId));
```

with:

```ts
				await db.update(matches).set(statusChange(newState.status)).where(eq(matches.id, matchId));
```

In `src/routes/c/[controlToken]/+page.server.ts` insert after line 5 (`import { eq, desc, asc, and } from 'drizzle-orm';`):

```ts
import { expireGuestLink, isGuestLinkExpired } from '$lib/server/match-service';
```

Replace line 14:

```ts
	if (!match) error(404, 'Link nicht gefunden');
```

with:

```ts
	if (!match) error(404, 'Link nicht gefunden');
	if (isGuestLinkExpired(match)) {
		await expireGuestLink(match.id);
		error(410, 'Spiel beendet');
	}
```

Create `src/routes/c/[controlToken]/+error.svelte`:

```svelte
<script lang="ts">
	import { page } from '$app/state';

	const expired = $derived(page.status === 404 || page.status === 410);
</script>

<svelte:head>
	<title>Scorely</title>
</svelte:head>

<main class="flex min-h-screen items-center justify-center bg-gray-900 px-4 text-center text-white">
	<div class="max-w-sm space-y-3">
		{#if expired}
			<h1 class="text-2xl font-bold">Link nicht mehr gültig</h1>
			<p class="text-gray-300">
				Das Spiel ist beendet oder es wurde ein neuer Freigabe-Link erstellt. Bitte frag die Person,
				die das Spiel streamt, nach dem aktuellen Link.
			</p>
		{:else}
			<h1 class="text-2xl font-bold">Etwas ist schiefgelaufen</h1>
			<p class="text-gray-300">{page.error?.message ?? 'Bitte versuche es später erneut.'}</p>
		{/if}
	</div>
</main>
```

In `src/routes/c/[controlToken]/+page.svelte` replace lines 39 to 42 (inside `api()`):

```ts
			if (res.ok) {
				match = updated;
				invalidateAll();
			}
```

with:

```ts
			if (res.ok) {
				match = updated;
				invalidateAll();
			} else if (res.status === 404 || res.status === 410) {
				// Link expired (grace period over) or replaced: reload so the load error shows the friendly page.
				await invalidateAll();
			}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/server/match-service.test.ts src/lib/server/auto-finish.test.ts "src/routes/api/c" "src/routes/c"`
Expected: PASS.

Run: `npm test && npm run check`
Expected: all test files pass; `svelte-check found 0 errors`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/db/schema.ts drizzle/0008_match_finished_at.sql drizzle/meta/_journal.json drizzle/meta/0008_snapshot.json src/lib/server/match-service.ts src/lib/server/match-service.test.ts src/lib/server/auto-finish.ts src/lib/server/auto-finish.test.ts "src/routes/api/c" "src/routes/c" "src/routes/api/matches/[matchId]/+server.ts" src/routes/api/match/+server.ts
git commit -m "feat(matches): expire the guest scorer link 10 minutes after a match is finished"
```

---

## Task 8: Final verification

**Files:**
- No new files. Fixes found here go into the file that owns the bug, with a regression test first, committed as `fix(...)`.

**Interfaces:**
- Consumes: everything above.
- Produces: green suite, clean type check, manual evidence against local dev.

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: PASS, 0 failed. Test files include `match-service`, `mobile-api`, `mobile-auth`, `auto-finish`, all new `server.test.ts` and `page.server.test.ts` files.

- [ ] **Step 2: Type and Svelte check**

Run: `npm run check`
Expected: `svelte-check found 0 errors and 0 warnings` (warnings that existed before this branch are acceptable; compare with `git stash && npm run check && git stash pop` if unsure).

- [ ] **Step 3: Manual curl checklist against local dev**

Start Postgres and Keycloak as usual, then `npm run dev` (port 5173). Getting a mobile token locally: in the LOCAL Keycloak admin console (http://localhost:8080) temporarily enable "Direct access grants" on client `scorely-mobile`. Never enable it in production (it would allow password grants against the public mobile client) and do not commit `keycloak/realm.json` with it enabled. Then:

```bash
export TOKEN=$(curl -s -d grant_type=password -d client_id=scorely-mobile \
  -d username=<club-user> -d password=<pw> \
  http://localhost:8080/realms/scoring/protocol/openid-connect/token | jq -r .access_token)
export WEB_TOKEN=$(curl -s -d grant_type=password -d client_id=scoring-app -d client_secret=<secret> \
  -d username=<club-user> -d password=<pw> \
  http://localhost:8080/realms/scoring/protocol/openid-connect/token | jq -r .access_token)
B=http://localhost:5173/api/mobile/matches
```

Check each line and tick it:

- [ ] `curl -i $B` gives 401 `{"error":"Unauthorized"}`.
- [ ] `curl -i -H "Authorization: Bearer $WEB_TOKEN" $B` gives 401 (wrong azp, server log shows `azp mismatch`).
- [ ] `curl -i -H "Authorization: Bearer $TOKEN" $B` gives 200, header `cache-control: no-store, no-cache, must-revalidate`, JSON object `{"orgName": <club name>, "matches": [...]}`, live first, no finished, no upcoming older than 12 h, upcoming without date listed after the dated ones, at most 50 items.
- [ ] Pick an upcoming id `ID`: `curl -i -X POST -H "Authorization: Bearer $TOKEN" $B/$ID/start` gives 200 with `"status":"live"`; repeating it gives 200 again and the web control page still shows the same score.
- [ ] `curl -s -X POST -H "Authorization: Bearer $TOKEN" $B/$ID/share` twice returns the same `controlUrl`; `overlayUrl` is `http://localhost:5173/matches/$ID/overlay`.
- [ ] Open `controlUrl` in a private window: the guest scorer page loads and scoring works.
- [ ] `curl -s -X POST -H "Authorization: Bearer $TOKEN" $B/$ID/share/renew` returns a new `controlUrl`; the old one now shows "Link nicht mehr gültig".
- [ ] Use an id of another org (create one with a second club user): start, share and renew all give 404.
- [ ] `curl -i -X POST -H "Authorization: Bearer $TOKEN" $B/abc/start` gives 404.
- [ ] Score the match to 3:0 via the guest page: the page stays usable and shows the finished match; `docker compose exec -T postgres psql -U scoring -d scoring -c "select status, finished_at, control_token from matches where id = $ID"` shows `finished`, a timestamp and the token; start, share and renew now give 409.
- [ ] Within 10 minutes, tap undo on the guest page: status back to `live`, `finished_at` null, same token; scoring continues on the same link.
- [ ] Score the match point again, then wait more than 10 minutes and tap any button on the guest page: it switches to "Link nicht mehr gültig"; `control_token` is now null. (Shortcut: `update matches set finished_at = now() - interval '11 minutes' where id = $ID` instead of waiting.)
- [ ] Repeat the expiry with a second finished match, but trigger it via `curl -s -H "Authorization: Bearer $TOKEN" $B` (runs `autoFinishStale`) instead of the guest page: its `control_token` is null afterwards.
- [ ] In the web control page undo the last point of the expired match: status back to `live`, `control_token` still null; share now returns a new link.
- [ ] Web control page: "Freigabe-Link erstellen" still creates a link for a live match.
- [ ] Web: open `/matches/<id of another org>/control` while signed in: 404.
- [ ] Web: `curl -i -X POST -H "Content-Type: application/json" -b <session cookie> -d '{}' http://localhost:5173/api/teams/<team id of another org>/matches` gives 404 `{"error":"Team not found"}`.
- [ ] Rate limit: `for i in $(seq 1 105); do curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $TOKEN" $B; done | sort | uniq -c` shows some `429`.
- [ ] Disable "Direct access grants" on `scorely-mobile` again in the local Keycloak (it must never be enabled in production).

- [ ] **Step 4: Commit only if fixes were needed**

```bash
git status --short
```

Expected: clean. If a fix was made, it was already committed in its own `fix(...)` commit with its regression test.

---

## Self-Review: Spec Coverage

| Spec Part 1 requirement | Task |
|---|---|
| `GET /api/mobile/matches`: autoFinishStale, live plus upcoming from 12 h ago or without date (undated last), live first then scheduledAt, limit 50, `{orgName, matches}` shape | 1 (service, `getClubName`), 4 (route) |
| `POST .../start`: upcoming to live via shared `startMatch`, idempotent for live, 409 finished, match item | 1, 5 |
| `POST .../share`: existing or new token (`ensureControlToken`), 409 finished, `{controlUrl, overlayUrl}` | 1, 6 |
| `POST .../share/renew`: replaces token, 409 finished | 1, 6 |
| `controlUrl` and `overlayUrl` format from origin | 6 |
| Bearer auth via `verifyMobileToken`, org check on every match (404) | 2, 4, 5, 6 |
| JSON with `Cache-Control: no-store`, rate limited like overlay-info | 4 (`mobileJson`), hooks unchanged (Global Constraints), 8 (manual check) |
| `match-service.ts` with `listMobileMatches`, `startMatch`, `ensureControlToken`, `renewControlToken`, `getOrgMatch`, used by web routes too | 1 (activate, generateControlToken), 3 (control page) |
| Link expiry: `/c` and `/api/c` keep working 10 minutes after finish, then 410 with friendly page and lazy token clearing | 7 |
| `finished_at` column and migration; set on finish (score path, `autoFinishStale`), cleared on undo to live; `autoFinishStale` clears tokens older than the grace period | 7 |
| start, share and renew return 200; no role check | 5, 6 (tests assert 200), Global Constraints |
| Security: control page org filter | 3 |
| Security: team ownership check on team match POST | 3 |
| `verifyMobileToken` returns `{orgId, sub, roles}` | 2 |
| Tests: auth missing or wrong azp, foreign org 404, 409 status rules, token reuse vs renew, expiry on finish, match-service unit tests | 1, 2, 4, 5, 6, 7 |
| Docs: `MOBILE_CLIENT_ID` in `.env.example` | 2 |
