import { describe, it, expect, vi, beforeEach } from 'vitest';

const settingsFindFirst = vi.hoisted(() => vi.fn());
const matchesFindFirst = vi.hoisted(() => vi.fn());
const loadMatchOverlayDataMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db/index.js', () => ({
	db: { query: { settings: { findFirst: settingsFindFirst }, matches: { findFirst: matchesFindFirst } } }
}));
vi.mock('$lib/server/overlay-data.js', () => ({ loadMatchOverlayData: loadMatchOverlayDataMock }));

const { load } = await import('./+page.server');

type LoadEvent = Parameters<typeof load>[0];

function run(slug = 'vbc') {
	return load({ params: { slug } } as unknown as LoadEvent) as Promise<{ match: unknown; matchId: number | null }>;
}

describe('overlay slug load', () => {
	beforeEach(() => {
		settingsFindFirst.mockReset();
		matchesFindFirst.mockReset();
		loadMatchOverlayDataMock.mockReset().mockResolvedValue({ match: { id: 7 } });
	});

	it('returns empty data for an unknown slug', async () => {
		settingsFindFirst.mockResolvedValueOnce(undefined);
		expect((await run()).matchId).toBeNull();
	});

	it('returns empty data when the permalink match belongs to another org', async () => {
		settingsFindFirst.mockResolvedValueOnce({ orgId: 'org-a' }).mockResolvedValueOnce({ value: '7' });
		matchesFindFirst.mockResolvedValue(undefined);
		const result = await run();
		expect(result.matchId).toBeNull();
		expect(loadMatchOverlayDataMock).not.toHaveBeenCalled();
	});

	it('loads the permalink match of the slug org', async () => {
		settingsFindFirst.mockResolvedValueOnce({ orgId: 'org-a' }).mockResolvedValueOnce({ value: '7' });
		matchesFindFirst.mockResolvedValue({ id: 7, orgId: 'org-a' });
		const result = await run();
		expect(result.matchId).toBe(7);
		expect(loadMatchOverlayDataMock).toHaveBeenCalledWith(7);
	});
});
