import { describe, it, expect, vi, beforeEach } from 'vitest';

const settingsFindFirst = vi.hoisted(() => vi.fn());
const matchesFindFirst = vi.hoisted(() => vi.fn());
const onConflictDoUpdateMock = vi.hoisted(() => vi.fn());
const insertValuesMock = vi.hoisted(() => vi.fn());
const emitAllMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db/index.js', () => ({
	db: {
		query: { settings: { findFirst: settingsFindFirst }, matches: { findFirst: matchesFindFirst } },
		insert: () => ({ values: insertValuesMock })
	}
}));
vi.mock('$lib/server/sse.js', () => ({ emitAll: emitAllMock }));

const { PUT } = await import('./+server');

type PutEvent = Parameters<typeof PUT>[0];

function put(body: unknown) {
	return PUT({
		request: new Request('https://scorely.ch/api/overlay/permalink', { method: 'PUT', body: JSON.stringify(body) }),
		locals: { orgId: 'org-a', isAdmin: true }
	} as unknown as PutEvent);
}

describe('permalink PUT', () => {
	beforeEach(() => {
		settingsFindFirst.mockReset().mockResolvedValue(undefined);
		matchesFindFirst.mockReset();
		onConflictDoUpdateMock.mockReset().mockResolvedValue(undefined);
		insertValuesMock.mockReset().mockReturnValue({ onConflictDoUpdate: onConflictDoUpdateMock });
		emitAllMock.mockReset();
	});

	it('returns 404 without writing or emitting for a match of another org', async () => {
		matchesFindFirst.mockResolvedValue(undefined);
		const res = await put({ matchId: 99 });
		expect(res.status).toBe(404);
		expect(insertValuesMock).not.toHaveBeenCalled();
		expect(emitAllMock).not.toHaveBeenCalled();
	});

	it('returns 404 for a non-numeric match id', async () => {
		const res = await put({ matchId: 'abc' as unknown as number });
		expect(res.status).toBe(404);
		expect(insertValuesMock).not.toHaveBeenCalled();
		expect(emitAllMock).not.toHaveBeenCalled();
	});

	it('stores and emits for an owned match', async () => {
		matchesFindFirst.mockResolvedValue({ id: 5, orgId: 'org-a', homeTeamName: 'A', guestTeamName: 'B' });
		const res = await put({ matchId: 5 });
		expect(res.status).toBe(200);
		expect(insertValuesMock).toHaveBeenCalledWith({ orgId: 'org-a', key: 'permalinkOverlayMatchId', value: '5' });
		expect(emitAllMock).toHaveBeenCalledWith(5, { type: 'permalink', data: { matchId: 5 } });
		expect(await res.json()).toEqual({ matchId: 5, homeTeamName: 'A', guestTeamName: 'B' });
	});

	it('clears the permalink without a match lookup', async () => {
		settingsFindFirst.mockResolvedValue({ value: '5' });
		const res = await put({ matchId: null });
		expect(res.status).toBe(200);
		expect(matchesFindFirst).not.toHaveBeenCalled();
		expect(emitAllMock).toHaveBeenCalledWith(5, { type: 'permalink', data: { matchId: null } });
	});
});
