import { describe, it, expect, vi, beforeEach } from 'vitest';

const getOrgMatchMock = vi.hoisted(() => vi.fn());
const matchesFindFirstMock = vi.hoisted(() => vi.fn());
const scoresFindFirstMock = vi.hoisted(() => vi.fn());
const scoresFindManyMock = vi.hoisted(() => vi.fn());
const timeoutsFindManyMock = vi.hoisted(() => vi.fn());
const designTemplatesFindFirstMock = vi.hoisted(() => vi.fn());
const designTemplatesFindManyMock = vi.hoisted(() => vi.fn());
const settingsFindFirstMock = vi.hoisted(() => vi.fn());
const settingsFindManyMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db/index.js', () => ({
	db: {
		query: {
			matches: { findFirst: matchesFindFirstMock },
			scores: { findFirst: scoresFindFirstMock, findMany: scoresFindManyMock },
			timeouts: { findMany: timeoutsFindManyMock },
			designTemplates: { findFirst: designTemplatesFindFirstMock, findMany: designTemplatesFindManyMock },
			settings: { findFirst: settingsFindFirstMock, findMany: settingsFindManyMock }
		}
	}
}));
vi.mock('$lib/server/match-service', () => ({ getOrgMatch: getOrgMatchMock }));
vi.mock('$lib/server/swiss-volley.js', () => ({ getUpcomingGames: vi.fn() }));
vi.mock('$lib/server/overlay-slug', () => ({ ensureOverlaySlug: vi.fn() }));
vi.mock('$lib/server/match-state.js', () => ({ toMatchState: vi.fn(() => ({ id: 7 })) }));

const { load } = await import('./+page.server.js');
const { loadMatchOverlayData } = await import('$lib/server/overlay-data.js');

function event(matchId: string) {
	return { params: { matchId }, locals: { orgId: 'org-1' } } as unknown as Parameters<typeof load>[0];
}

const ORG_SETTINGS = [
	{ key: 'defaultScoreboardLayout', value: 'drawer' },
	{ key: 'defaultScoreboardOptions', value: '{"showLogos":true}' }
];

function baseMatch(overrides: Record<string, unknown> = {}) {
	return {
		id: 7,
		orgId: 'org-1',
		teamId: null,
		controlToken: null,
		homeTeamLogo: null,
		guestTeamLogo: null,
		swissVolleyMatchId: null,
		designTemplateId: null,
		scoreboardLayout: null,
		scoreboardOptions: null,
		...overrides
	};
}

describe('control page load', () => {
	beforeEach(() => {
		getOrgMatchMock.mockReset();
		matchesFindFirstMock.mockReset();
		scoresFindFirstMock.mockReset();
		scoresFindManyMock.mockReset();
		timeoutsFindManyMock.mockReset();
		designTemplatesFindFirstMock.mockReset();
		designTemplatesFindManyMock.mockReset();
		settingsFindFirstMock.mockReset();
		settingsFindManyMock.mockReset();
		matchesFindFirstMock.mockResolvedValue({ id: 7, orgId: 'other-org' });
		scoresFindFirstMock.mockResolvedValue({ id: 1, matchId: 7, currentSet: 1 });
		scoresFindManyMock.mockResolvedValue([]);
		timeoutsFindManyMock.mockResolvedValue([]);
		designTemplatesFindManyMock.mockResolvedValue([]);
		settingsFindFirstMock.mockResolvedValue(null);
		settingsFindManyMock.mockResolvedValue(ORG_SETTINGS);
	});

	it('returns 404 for a match of another org', async () => {
		getOrgMatchMock.mockResolvedValue(null);
		await expect(load(event('7'))).rejects.toMatchObject({ status: 404 });
		expect(getOrgMatchMock).toHaveBeenCalledWith('org-1', 7);
	});

	it('resolves the org default layout and options for a match without override, same as the overlay', async () => {
		const match = baseMatch();
		getOrgMatchMock.mockResolvedValue(match);
		matchesFindFirstMock.mockResolvedValue(match);

		const result = (await load(event('7'))) as Record<string, any>;
		const overlay = await loadMatchOverlayData(7);

		expect(result.overlayDesign).toEqual({
			customCode: overlay.customCode,
			templateId: overlay.templateId,
			scoreboardLayout: overlay.scoreboardLayout,
			scoreboardOptions: overlay.scoreboardOptions
		});
		expect(result.overlayDesign.scoreboardLayout).toBe('drawer');
		expect(result.overlayDesign.scoreboardOptions).toEqual({ showLogos: true });
		expect(result.scoreboardLayout).toBeNull();
		expect(result.orgDefaultLayout).toBe('drawer');
	});

	it('uses the match override and template over org defaults, same as the overlay', async () => {
		const match = baseMatch({
			designTemplateId: 3,
			scoreboardLayout: 'colon',
			scoreboardOptions: { showLogos: false }
		});
		getOrgMatchMock.mockResolvedValue(match);
		matchesFindFirstMock.mockResolvedValue(match);
		designTemplatesFindFirstMock.mockResolvedValue({
			id: 3,
			orgId: 'org-1',
			isPublic: false,
			customCode: '.x{}'
		});

		const result = (await load(event('7'))) as Record<string, any>;
		const overlay = await loadMatchOverlayData(7);

		expect(result.overlayDesign).toEqual({
			customCode: '.x{}',
			templateId: 3,
			scoreboardLayout: 'colon',
			scoreboardOptions: { showLogos: false }
		});
		expect(result.overlayDesign).toEqual({
			customCode: overlay.customCode,
			templateId: overlay.templateId,
			scoreboardLayout: overlay.scoreboardLayout,
			scoreboardOptions: overlay.scoreboardOptions
		});
	});

	it('drops another orgs private template like the overlay', async () => {
		const match = baseMatch({ designTemplateId: 9 });
		getOrgMatchMock.mockResolvedValue(match);
		matchesFindFirstMock.mockResolvedValue(match);
		designTemplatesFindFirstMock.mockResolvedValue({
			id: 9,
			orgId: 'other-org',
			isPublic: false,
			customCode: '.secret{}'
		});

		const result = (await load(event('7'))) as Record<string, any>;

		expect(result.overlayDesign.customCode).toBeNull();
		expect(result.overlayDesign.templateId).toBeNull();
	});
});
