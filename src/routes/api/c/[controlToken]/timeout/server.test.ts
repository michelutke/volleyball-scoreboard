import { describe, it, expect, vi, beforeEach } from 'vitest';

const matchesFindFirstMock = vi.hoisted(() => vi.fn());
const scoresFindFirstMock = vi.hoisted(() => vi.fn());
const insertValuesMock = vi.hoisted(() => vi.fn());
const updateSetMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db/index.js', () => ({
	db: {
		query: {
			matches: { findFirst: matchesFindFirstMock },
			scores: { findFirst: scoresFindFirstMock },
			timeouts: { findFirst: vi.fn(), findMany: vi.fn() }
		},
		update: () => ({ set: updateSetMock }),
		insert: () => ({ values: insertValuesMock }),
		delete: () => ({ where: vi.fn() })
	}
}));
vi.mock('$lib/server/sse.js', () => ({ matchSSEEmitter: { emit: vi.fn() } }));

const { POST, DELETE } = await import('./+server.js');

function event(method: string) {
	return {
		params: { controlToken: 'tok-1' },
		request: new Request('http://localhost/api/c/tok-1/timeout', {
			method,
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ team: 'home' })
		})
	} as unknown as Parameters<typeof POST>[0];
}

describe('/api/c/[controlToken]/timeout', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		updateSetMock.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
		matchesFindFirstMock.mockResolvedValue({
			id: 7,
			status: 'finished',
			finishedAt: new Date(Date.now() - 11 * 60 * 1000),
			controlToken: 'tok-1'
		});
	});

	it('POST returns 410 after the grace period and clears the token', async () => {
		const response = await POST(event('POST'));
		expect(response.status).toBe(410);
		expect(updateSetMock).toHaveBeenCalledWith({ controlToken: null });
		expect(insertValuesMock).not.toHaveBeenCalled();
	});

	it('DELETE returns 410 after the grace period', async () => {
		const response = await DELETE(event('DELETE'));
		expect(response.status).toBe(410);
	});

	describe('match without a score row', () => {
		beforeEach(() => {
			matchesFindFirstMock.mockResolvedValue({ id: 7, status: 'upcoming', finishedAt: null, controlToken: 'tok-1' });
			scoresFindFirstMock.mockResolvedValue(undefined);
		});

		it('POST returns 409', async () => {
			const response = await POST(event('POST'));
			expect(response.status).toBe(409);
			expect(await response.json()).toEqual({ error: 'Match not started' });
			expect(insertValuesMock).not.toHaveBeenCalled();
		});

		it('DELETE returns 409', async () => {
			const response = await DELETE(event('DELETE'));
			expect(response.status).toBe(409);
			expect(await response.json()).toEqual({ error: 'Match not started' });
		});
	});
});
