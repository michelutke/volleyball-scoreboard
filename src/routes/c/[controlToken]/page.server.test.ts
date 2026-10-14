import { describe, it, expect, vi, beforeEach } from 'vitest';

const matchesFindFirstMock = vi.hoisted(() => vi.fn());
const scoresFindFirstMock = vi.hoisted(() => vi.fn());
const updateSetMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db/index.js', () => ({
	db: {
		query: {
			matches: { findFirst: matchesFindFirstMock },
			scores: { findFirst: scoresFindFirstMock, findMany: vi.fn().mockResolvedValue([]) },
			timeouts: { findMany: vi.fn().mockResolvedValue([]) }
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
});
