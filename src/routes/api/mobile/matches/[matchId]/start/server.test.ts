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
