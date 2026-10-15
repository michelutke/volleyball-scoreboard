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
