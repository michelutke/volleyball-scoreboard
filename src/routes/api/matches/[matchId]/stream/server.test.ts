import { describe, it, expect, vi, beforeEach } from 'vitest';

const matchesFindFirst = vi.hoisted(() => vi.fn());
vi.mock('$lib/server/db/index.js', () => ({ db: { query: { matches: { findFirst: matchesFindFirst } } } }));
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
