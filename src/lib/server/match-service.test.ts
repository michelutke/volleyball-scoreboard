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
