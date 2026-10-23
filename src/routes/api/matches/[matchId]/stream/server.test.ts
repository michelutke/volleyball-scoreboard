import { describe, it, expect, vi, beforeEach } from 'vitest';

const matchesFindFirst = vi.hoisted(() => vi.fn());
const scoresFindFirst = vi.hoisted(() => vi.fn());
vi.mock('$lib/server/db/index.js', () => ({
	db: { query: { matches: { findFirst: matchesFindFirst }, scores: { findFirst: scoresFindFirst } } }
}));
const env = vi.hoisted(() => ({ ADDRESS_HEADER: 'X-Forwarded-For' as string | undefined }));
vi.mock('$env/dynamic/private', () => ({ env }));

const { GET } = await import('./+server');

type GetEvent = Parameters<typeof GET>[0];

function call(matchId: string, ip = '1.2.3.4') {
	return GET({ params: { matchId }, getClientAddress: () => ip } as unknown as GetEvent);
}

describe('match stream GET', () => {
	beforeEach(() => {
		matchesFindFirst.mockReset();
		scoresFindFirst.mockReset();
	});

	async function readChunks(res: Response, count: number): Promise<string> {
		const reader = res.body!.getReader();
		const decoder = new TextDecoder();
		let text = '';
		for (let i = 0; i < count; i++) text += decoder.decode((await reader.read()).value);
		await reader.cancel();
		return text;
	}

	it('starts with a ping and the current match state', async () => {
		matchesFindFirst.mockResolvedValue({ id: 3, homeTeamName: 'VBC Thun', status: 'live' });
		scoresFindFirst.mockResolvedValue({ homePoints: 12, guestPoints: 9, homeSets: 1, guestSets: 0, currentSet: 2, setScores: [], serviceTeam: 'home' });
		const text = await readChunks(await call('3', '5.5.5.5'), 2);
		expect(text.startsWith('event: ping\ndata: \n\n')).toBe(true);
		const snapshot = JSON.parse(text.split('\n\n')[1].replace(/^data: /, ''));
		expect(snapshot.type).toBe('match');
		expect(snapshot.data).toMatchObject({ matchId: 3, homePoints: 12, guestPoints: 9, currentSet: 2 });
	});

	it('sends only the ping when the match has no score yet', async () => {
		matchesFindFirst.mockResolvedValue({ id: 4 });
		scoresFindFirst.mockResolvedValue(undefined);
		const res = await call('4', '6.6.6.6');
		const reader = res.body!.getReader();
		expect(new TextDecoder().decode((await reader.read()).value)).toBe('event: ping\ndata: \n\n');
		await reader.cancel();
	});

	it('returns 404 for an unknown match', async () => {
		matchesFindFirst.mockResolvedValue(undefined);
		await expect(call('42')).rejects.toMatchObject({ status: 404 });
	});

	it('returns 404 for a non-numeric match id without a db lookup', async () => {
		await expect(call('abc')).rejects.toMatchObject({ status: 404 });
		await expect(call('1abc')).rejects.toMatchObject({ status: 404 });
		expect(matchesFindFirst).not.toHaveBeenCalled();
	});

	it('caps concurrent connections per IP and frees a slot on close', async () => {
		matchesFindFirst.mockResolvedValue({ id: 1 });
		const responses: Response[] = [];
		for (let i = 0; i < 20; i++) responses.push(await call('1', '9.9.9.9'));
		expect(responses[0].headers.get('content-type')).toBe('text/event-stream');

		await expect(call('1', '9.9.9.9')).rejects.toMatchObject({ status: 429 });
		expect((await call('1', '8.8.8.8')).status).toBe(200);

		await responses[0].body!.cancel();
		const again = await call('1', '9.9.9.9');
		expect(again.status).toBe(200);

		await again.body!.cancel();
		for (const res of responses.slice(1)) await res.body!.cancel();
	});

	it('does not cap when the real client IP is unknown (no ADDRESS_HEADER)', async () => {
		env.ADDRESS_HEADER = undefined;
		matchesFindFirst.mockResolvedValue({ id: 7 });
		const responses = await Promise.all(Array.from({ length: 25 }, () => call('7', '10.0.0.1')));
		expect(responses.every((r) => r.status === 200)).toBe(true);
		await Promise.all(responses.map((r) => r.body?.cancel()));
		env.ADDRESS_HEADER = 'X-Forwarded-For';
	});
});
