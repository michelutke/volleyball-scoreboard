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
