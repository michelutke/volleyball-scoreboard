import { describe, it, expect, vi, beforeEach } from 'vitest';

const matchesFindFirstMock = vi.hoisted(() => vi.fn());
const scoresFindFirstMock = vi.hoisted(() => vi.fn());
const timeoutsFindManyMock = vi.hoisted(() => vi.fn());
const designTemplatesFindFirstMock = vi.hoisted(() => vi.fn());
const settingsFindManyMock = vi.hoisted(() => vi.fn());
const toMatchStateMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db/index.js', () => ({
	db: {
		query: {
			matches: { findFirst: matchesFindFirstMock },
			scores: { findFirst: scoresFindFirstMock },
			timeouts: { findMany: timeoutsFindManyMock },
			designTemplates: { findFirst: designTemplatesFindFirstMock },
			settings: { findMany: settingsFindManyMock }
		}
	}
}));

vi.mock('$lib/server/match-state.js', () => ({
	toMatchState: toMatchStateMock
}));

const { loadMatchOverlayData } = await import('./overlay-data.js');

describe('loadMatchOverlayData', () => {
	beforeEach(() => {
		matchesFindFirstMock.mockReset();
		scoresFindFirstMock.mockReset();
		timeoutsFindManyMock.mockReset();
		designTemplatesFindFirstMock.mockReset();
		settingsFindManyMock.mockReset();
		toMatchStateMock.mockReset();
	});

	it('returns null-safe defaults when the match does not exist', async () => {
		matchesFindFirstMock.mockResolvedValue(undefined);

		const result = await loadMatchOverlayData(999);

		expect(result).toEqual({
			match: null,
			timeouts: { home: 0, guest: 0 },
			customCode: null,
			templateId: null,
			scoreboardLayout: null,
			scoreboardOptions: null
		});
		expect(scoresFindFirstMock).not.toHaveBeenCalled();
	});

	it('returns null-safe defaults when there is no score yet', async () => {
		matchesFindFirstMock.mockResolvedValue({ id: 1, orgId: 'org-1', designTemplateId: null });
		scoresFindFirstMock.mockResolvedValue(undefined);

		const result = await loadMatchOverlayData(1);

		expect(result).toEqual({
			match: null,
			timeouts: { home: 0, guest: 0 },
			customCode: null,
			templateId: null,
			scoreboardLayout: null,
			scoreboardOptions: null
		});
		expect(timeoutsFindManyMock).not.toHaveBeenCalled();
	});

	it('loads timeouts, template, and org defaults when a score exists', async () => {
		matchesFindFirstMock.mockResolvedValue({
			id: 1,
			orgId: 'org-1',
			designTemplateId: 5,
			scoreboardLayout: null,
			scoreboardOptions: null
		});
		scoresFindFirstMock.mockResolvedValue({ currentSet: 2 });
		timeoutsFindManyMock.mockResolvedValueOnce([{ id: 1 }]).mockResolvedValueOnce([]);
		designTemplatesFindFirstMock.mockResolvedValue({ id: 5, customCode: '<div>custom</div>' });
		settingsFindManyMock.mockResolvedValue([
			{ key: 'defaultScoreboardLayout', value: 'classic' },
			{ key: 'defaultScoreboardOptions', value: '{"foo":"bar"}' }
		]);
		toMatchStateMock.mockReturnValue({ matchId: 1 });

		const result = await loadMatchOverlayData(1);

		expect(result).toEqual({
			match: { matchId: 1 },
			timeouts: { home: 1, guest: 0 },
			customCode: '<div>custom</div>',
			templateId: 5,
			scoreboardLayout: 'classic',
			scoreboardOptions: { foo: 'bar' }
		});
	});
});
