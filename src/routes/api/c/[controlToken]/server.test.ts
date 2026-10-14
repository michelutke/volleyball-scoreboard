import { describe, it, expect, vi, beforeEach } from 'vitest';

const matchesFindFirstMock = vi.hoisted(() => vi.fn());
const scoresFindFirstMock = vi.hoisted(() => vi.fn());
const scoresFindManyMock = vi.hoisted(() => vi.fn());
const updateSetMock = vi.hoisted(() => vi.fn());
const insertValuesMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db/index.js', () => ({
	db: {
		query: {
			matches: { findFirst: matchesFindFirstMock },
			scores: { findFirst: scoresFindFirstMock, findMany: scoresFindManyMock }
		},
		update: () => ({ set: updateSetMock }),
		insert: () => ({ values: insertValuesMock }),
		delete: () => ({ where: vi.fn() })
	}
}));
vi.mock('$lib/server/sse.js', () => ({ matchSSEEmitter: { emit: vi.fn() } }));

const { PUT } = await import('./+server.js');

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000);

function event(body: unknown) {
	return {
		params: { controlToken: 'tok-1' },
		request: new Request('http://localhost/api/c/tok-1', {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		})
	} as unknown as Parameters<typeof PUT>[0];
}

function matchRow(overrides: Record<string, unknown> = {}) {
	return {
		id: 7,
		orgId: 'org-1',
		status: 'live',
		controlToken: 'tok-1',
		finishedAt: null,
		homeTeamName: 'Home',
		guestTeamName: 'Guest',
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

describe('PUT /api/c/[controlToken]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		updateSetMock.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
		insertValuesMock.mockResolvedValue(undefined);
	});

	it('returns 410 after the grace period and clears the token', async () => {
		matchesFindFirstMock.mockResolvedValue(matchRow({ status: 'finished', finishedAt: minutesAgo(11) }));
		const response = await PUT(event({ action: 'addPoint', team: 'home' }));
		expect(response.status).toBe(410);
		expect(await response.json()).toEqual({ error: 'Link expired' });
		expect(updateSetMock).toHaveBeenCalledTimes(1);
		expect(updateSetMock).toHaveBeenCalledWith({ controlToken: null });
		expect(insertValuesMock).not.toHaveBeenCalled();
	});

	it('returns 410 for a match finished before finishedAt existed', async () => {
		matchesFindFirstMock.mockResolvedValue(matchRow({ status: 'finished', finishedAt: null }));
		const response = await PUT(event({ action: 'undo' }));
		expect(response.status).toBe(410);
		expect(scoresFindManyMock).not.toHaveBeenCalled();
	});

	it('returns 404 for an unknown token', async () => {
		matchesFindFirstMock.mockResolvedValue(undefined);
		const response = await PUT(event({ action: 'addPoint', team: 'home' }));
		expect(response.status).toBe(404);
	});

	it('stamps finishedAt and keeps the token when the match point finishes the match', async () => {
		matchesFindFirstMock.mockResolvedValue(matchRow());
		scoresFindFirstMock.mockResolvedValue(
			scoreRow({
				homePoints: 24,
				guestPoints: 10,
				homeSets: 2,
				currentSet: 3,
				setScores: [
					{ home: 25, guest: 10 },
					{ home: 25, guest: 10 }
				]
			})
		);
		const response = await PUT(event({ action: 'addPoint', team: 'home' }));
		expect(response.status).toBe(200);
		expect((await response.json()).status).toBe('finished');
		expect(updateSetMock).toHaveBeenCalledWith({
			status: 'finished',
			updatedAt: expect.any(Date),
			finishedAt: expect.any(Date)
		});
	});

	it('allows the guest to undo the final point within the grace period', async () => {
		matchesFindFirstMock.mockResolvedValue(matchRow({ status: 'finished', finishedAt: minutesAgo(2) }));
		const finalScore = scoreRow({ id: 2, homeSets: 3, currentSet: 3 });
		const beforeFinal = scoreRow({ id: 1, homePoints: 24, guestPoints: 10, homeSets: 2, currentSet: 3 });
		scoresFindFirstMock.mockResolvedValue(finalScore);
		scoresFindManyMock.mockResolvedValue([finalScore, beforeFinal]);
		const response = await PUT(event({ action: 'undo' }));
		expect(response.status).toBe(200);
		expect((await response.json()).status).toBe('live');
		expect(updateSetMock).toHaveBeenCalledTimes(1);
		expect(updateSetMock).toHaveBeenCalledWith({ status: 'live', updatedAt: expect.any(Date), finishedAt: null });
	});

	it('keeps the token for a normal point', async () => {
		matchesFindFirstMock.mockResolvedValue(matchRow());
		scoresFindFirstMock.mockResolvedValue(scoreRow({ homePoints: 3 }));
		const response = await PUT(event({ action: 'addPoint', team: 'home' }));
		expect(response.status).toBe(200);
		expect(updateSetMock).not.toHaveBeenCalled();
		expect(insertValuesMock).toHaveBeenCalled();
	});
});
