import { describe, it, expect, vi, beforeEach } from 'vitest';

const matchesFindManyMock = vi.hoisted(() => vi.fn());
const scoresFindFirstMock = vi.hoisted(() => vi.fn());
const scoresFindManyMock = vi.hoisted(() => vi.fn());
const timeoutsFindManyMock = vi.hoisted(() => vi.fn());
const settingsFindManyMock = vi.hoisted(() => vi.fn());
const designTemplatesFindFirstMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db/index.js', () => ({
	db: {
		query: {
			matches: { findMany: matchesFindManyMock },
			scores: { findFirst: scoresFindFirstMock, findMany: scoresFindManyMock },
			timeouts: { findMany: timeoutsFindManyMock },
			settings: { findMany: settingsFindManyMock },
			designTemplates: { findFirst: designTemplatesFindFirstMock }
		}
	}
}));
vi.mock('$lib/server/match-state.js', () => ({ toMatchState: vi.fn(() => ({ matchId: 7 })) }));

const { load } = await import('./+page.server.js');

function event() {
	return { locals: { orgId: 'org-1' } } as unknown as Parameters<typeof load>[0];
}

function match(overrides: Record<string, unknown> = {}) {
	return {
		id: 7,
		orgId: 'org-1',
		status: 'live',
		designTemplateId: null,
		scoreboardLayout: null,
		scoreboardOptions: null,
		...overrides
	};
}

describe('/control load', () => {
	beforeEach(() => {
		matchesFindManyMock.mockReset();
		scoresFindFirstMock.mockReset();
		scoresFindManyMock.mockReset();
		timeoutsFindManyMock.mockReset();
		settingsFindManyMock.mockReset();
		designTemplatesFindFirstMock.mockReset();
		scoresFindFirstMock.mockResolvedValue({ id: 1, matchId: 7, currentSet: 1 });
		scoresFindManyMock.mockResolvedValue([]);
		timeoutsFindManyMock.mockResolvedValue([]);
		settingsFindManyMock.mockResolvedValue([
			{ key: 'defaultScoreboardLayout', value: 'drawer' },
			{ key: 'defaultScoreboardOptions', value: '{"showLogos":true}' }
		]);
	});

	it('has no overlay design when the org has no matches', async () => {
		matchesFindManyMock.mockResolvedValue([]);
		expect(await load(event())).toMatchObject({ activeMatch: null, overlayDesign: null });
	});

	it('resolves org defaults for the live match without override', async () => {
		matchesFindManyMock.mockResolvedValue([match()]);
		expect(await load(event())).toMatchObject({
			overlayDesign: { customCode: null, templateId: null, scoreboardLayout: 'drawer', scoreboardOptions: { showLogos: true } }
		});
	});

	it('uses the live match override and template', async () => {
		matchesFindManyMock.mockResolvedValue([
			match({ designTemplateId: 3, scoreboardLayout: 'colon', scoreboardOptions: { showLogos: false } })
		]);
		designTemplatesFindFirstMock.mockResolvedValue({ id: 3, orgId: 'org-1', isPublic: false, customCode: '.x{}' });
		expect(await load(event())).toMatchObject({
			overlayDesign: { customCode: '.x{}', templateId: 3, scoreboardLayout: 'colon', scoreboardOptions: { showLogos: false } }
		});
	});
});
