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
