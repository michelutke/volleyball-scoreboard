import { describe, it, expect, vi, beforeEach } from 'vitest';

const findFirstMock = vi.hoisted(() => vi.fn());
const onConflictDoUpdateMock = vi.hoisted(() => vi.fn());
const insertValuesMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db/index.js', () => ({
	db: {
		query: { settings: { findFirst: findFirstMock } },
		insert: () => ({ values: insertValuesMock })
	}
}));

const { PUT } = await import('./+server');

type PutEvent = Parameters<typeof PUT>[0];

function put(body: unknown, isAdmin = true) {
	return PUT({
		request: new Request('https://scorely.ch/api/settings', { method: 'PUT', body: JSON.stringify(body) }),
		locals: { orgId: 'org-a', isAdmin }
	} as unknown as PutEvent);
}

describe('settings PUT overlaySlug', () => {
	beforeEach(() => {
		findFirstMock.mockReset();
		onConflictDoUpdateMock.mockReset().mockResolvedValue(undefined);
		insertValuesMock.mockReset().mockReturnValue({ onConflictDoUpdate: onConflictDoUpdateMock });
	});

	it('stores a valid free slug', async () => {
		findFirstMock.mockResolvedValue(undefined);
		const res = await put({ overlaySlug: 'vbc-thun' });
		expect(res.status).toBe(200);
		expect(insertValuesMock).toHaveBeenCalledWith({ orgId: 'org-a', key: 'overlaySlug', value: 'vbc-thun' });
	});

	it('allows an org to keep its own slug', async () => {
		findFirstMock.mockResolvedValue({ orgId: 'org-a', value: 'vbc-thun' });
		expect((await put({ overlaySlug: 'vbc-thun' })).status).toBe(200);
	});

	it('returns 409 when another org already has the slug', async () => {
		findFirstMock.mockResolvedValue({ orgId: 'org-b', value: 'vbc-thun' });
		const res = await put({ overlaySlug: 'vbc-thun' });
		expect(res.status).toBe(409);
		expect(await res.json()).toEqual({ error: 'Dieser Overlay-Link ist bereits vergeben.' });
		expect(insertValuesMock).not.toHaveBeenCalled();
	});

	it.each(['ab', '-abc', 'abc-', 'ABC', 'a b c', 'a/b', '', 'x'.repeat(65)])('rejects invalid slug %j', async (slug) => {
		const res = await put({ overlaySlug: slug });
		expect(res.status).toBe(400);
		expect(insertValuesMock).not.toHaveBeenCalled();
	});

	it('rejects a non-string slug', async () => {
		expect((await put({ overlaySlug: 123 })).status).toBe(400);
	});

	it('accepts the 3 and 64 character boundaries', async () => {
		findFirstMock.mockResolvedValue(undefined);
		expect((await put({ overlaySlug: 'abc' })).status).toBe(200);
		expect((await put({ overlaySlug: 'x'.repeat(64) })).status).toBe(200);
	});

	it('no longer accepts permalinkOverlayMatchId', async () => {
		expect((await put({ permalinkOverlayMatchId: '5' })).status).toBe(400);
	});

	it('rejects non-admins', async () => {
		expect((await put({ overlaySlug: 'abc' }, false)).status).toBe(403);
	});
});
