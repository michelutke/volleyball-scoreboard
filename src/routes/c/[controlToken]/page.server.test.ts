import { describe, it, expect, vi, beforeEach } from 'vitest';

const matchesFindFirstMock = vi.hoisted(() => vi.fn());
const scoresFindFirstMock = vi.hoisted(() => vi.fn());
const settingsFindManyMock = vi.hoisted(() => vi.fn());
const designTemplatesFindFirstMock = vi.hoisted(() => vi.fn());
const updateSetMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db/index.js', () => ({
	db: {
		query: {
			matches: { findFirst: matchesFindFirstMock },
			scores: { findFirst: scoresFindFirstMock, findMany: vi.fn().mockResolvedValue([]) },
			timeouts: { findMany: vi.fn().mockResolvedValue([]) },
			settings: { findMany: settingsFindManyMock },
			designTemplates: { findFirst: designTemplatesFindFirstMock }
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
		settingsFindManyMock.mockReset();
		settingsFindManyMock.mockResolvedValue([]);
		designTemplatesFindFirstMock.mockReset();
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

	it('returns 409 with a not-started message when the match has no score row yet', async () => {
		matchesFindFirstMock.mockResolvedValue({ id: 7, status: 'upcoming', finishedAt: null, controlToken: 'tok-1' });
		scoresFindFirstMock.mockResolvedValue(undefined);
		await expect(load(event())).rejects.toMatchObject({
			status: 409,
			body: { message: 'Spiel hat noch nicht begonnen' }
		});
	});

	it('still loads a finished match within the grace period so the guest can undo', async () => {
		matchesFindFirstMock.mockResolvedValue({ id: 7, status: 'finished', finishedAt: minutesAgo(1), controlToken: 'tok-1' });
		scoresFindFirstMock.mockResolvedValue({ id: 2, matchId: 7, homePoints: 0, guestPoints: 0, homeSets: 3, guestSets: 0, currentSet: 3, setScores: [], serviceTeam: 'home' });
		expect(await load(event())).toMatchObject({ controlToken: 'tok-1', activeMatch: { status: 'finished' } });
		expect(updateSetMock).not.toHaveBeenCalled();
	});

	it('returns the overlay design resolved with org defaults for a match without override', async () => {
		matchesFindFirstMock.mockResolvedValue({ id: 7, orgId: 'org-1', status: 'live', finishedAt: null, controlToken: 'tok-1', designTemplateId: null, scoreboardLayout: null, scoreboardOptions: null });
		scoresFindFirstMock.mockResolvedValue({ id: 2, matchId: 7, homePoints: 0, guestPoints: 0, homeSets: 0, guestSets: 0, currentSet: 1, setScores: [], serviceTeam: 'home' });
		settingsFindManyMock.mockResolvedValue([
			{ key: 'defaultScoreboardLayout', value: 'drawer' },
			{ key: 'defaultScoreboardOptions', value: '{"showLogos":true}' }
		]);
		expect(await load(event())).toMatchObject({
			overlayDesign: { customCode: null, templateId: null, scoreboardLayout: 'drawer', scoreboardOptions: { showLogos: true } }
		});
	});

	it('returns the match override and template over org defaults', async () => {
		matchesFindFirstMock.mockResolvedValue({ id: 7, orgId: 'org-1', status: 'live', finishedAt: null, controlToken: 'tok-1', designTemplateId: 3, scoreboardLayout: 'colon', scoreboardOptions: { showLogos: false } });
		scoresFindFirstMock.mockResolvedValue({ id: 2, matchId: 7, homePoints: 0, guestPoints: 0, homeSets: 0, guestSets: 0, currentSet: 1, setScores: [], serviceTeam: 'home' });
		settingsFindManyMock.mockResolvedValue([{ key: 'defaultScoreboardLayout', value: 'drawer' }]);
		designTemplatesFindFirstMock.mockResolvedValue({ id: 3, orgId: 'org-1', isPublic: false, customCode: '.x{}' });
		expect(await load(event())).toMatchObject({
			overlayDesign: { customCode: '.x{}', templateId: 3, scoreboardLayout: 'colon', scoreboardOptions: { showLogos: false } }
		});
	});
});
