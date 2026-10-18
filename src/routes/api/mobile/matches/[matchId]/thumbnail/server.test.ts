import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	SVG_BYTES,
	WEBP_BYTES,
	jpegBytes,
	markedJpeg,
	pngBytes,
	pngHeader,
	withJpegDimensions
} from '$lib/server/thumbnail/test-images';

const verifyMobileTokenMock = vi.hoisted(() => vi.fn());
const getOrgMatchMock = vi.hoisted(() => vi.fn());
const getBillingStatusMock = vi.hoisted(() => vi.fn());
const envMock = vi.hoisted(() => ({ STRIPE_SECRET_KEY: 'sk_test' }));
const settingsFindFirstMock = vi.hoisted(() => vi.fn());
const imagesFindFirstMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/mobile-auth', () => ({ verifyMobileToken: verifyMobileTokenMock }));
vi.mock('$lib/server/match-service', () => ({ getOrgMatch: getOrgMatchMock }));
vi.mock('$lib/server/billing', () => ({ getBillingStatus: getBillingStatusMock }));
vi.mock('$env/dynamic/private', () => ({ env: envMock }));
vi.mock('$lib/server/db/index.js', () => ({
	db: { query: { settings: { findFirst: settingsFindFirstMock }, orgImages: { findFirst: imagesFindFirstMock } } }
}));

const { GET, POST } = await import('./+server.js');

const IDENTITY = { orgId: 'org-1', sub: 'user-1', roles: [] };
const MATCH = {
	id: 7,
	homeTeamName: 'VBC Thun',
	guestTeamName: 'Volley Spiez',
	scheduledAt: new Date('2026-10-24T15:30:00Z'),
	venue: 'Spiez Arena'
};
const MAX = 5 * 1024 * 1024;

function event(
	method: 'GET' | 'POST',
	matchId: string,
	options: { headers?: Record<string, string>; body?: BodyInit | null } = {}
) {
	const headers = options.headers ?? { authorization: 'Bearer good' };
	return {
		params: { matchId },
		request: new Request(`https://scorely.ch/api/mobile/matches/${matchId}/thumbnail`, {
			method,
			headers,
			body: options.body ?? null
		})
	} as unknown as Parameters<typeof GET>[0];
}

function isJpeg(bytes: Uint8Array): boolean {
	return bytes[0] === 0xff && bytes[1] === 0xd8;
}

describe('mobile match thumbnail', () => {
	beforeEach(() => {
		verifyMobileTokenMock.mockReset().mockResolvedValue(IDENTITY);
		getOrgMatchMock.mockReset().mockResolvedValue(MATCH);
		getBillingStatusMock.mockReset().mockResolvedValue('allowed');
		settingsFindFirstMock.mockReset().mockResolvedValue(undefined);
		imagesFindFirstMock.mockReset().mockResolvedValue(undefined);
	});

	describe.each([
		['GET', GET],
		['POST', POST]
	] as const)('%s auth and lookup', (method, handler) => {
		it('returns 401 without Authorization header', async () => {
			const response = await handler(event(method, '7', { headers: {} }));
			expect(response.status).toBe(401);
			expect(getOrgMatchMock).not.toHaveBeenCalled();
		});

		it('returns 401 when the token fails verification', async () => {
			verifyMobileTokenMock.mockResolvedValue(null);
			expect((await handler(event(method, '7'))).status).toBe(401);
		});

		it('passes the 402 of a blocked subscription through', async () => {
			getBillingStatusMock.mockResolvedValue('blocked');
			const response = await handler(event(method, '7'));
			expect(response.status).toBe(402);
			expect(getOrgMatchMock).not.toHaveBeenCalled();
		});

		it('returns 404 for a malformed id', async () => {
			expect((await handler(event(method, '7a'))).status).toBe(404);
			expect(getOrgMatchMock).not.toHaveBeenCalled();
		});

		it('returns 404 for a match of another org', async () => {
			getOrgMatchMock.mockResolvedValue(null);
			expect((await handler(event(method, '7'))).status).toBe(404);
			expect(getOrgMatchMock).toHaveBeenCalledWith('org-1', 7);
		});
	});

	describe('GET', () => {
		it('renders a JPEG with the club slots of the org', async () => {
			settingsFindFirstMock.mockResolvedValue({ value: '#1d4ed8' });
			imagesFindFirstMock.mockResolvedValue({ contentType: 'image/jpeg', data: jpegBytes(640, 360) });
			const response = await GET(event('GET', '7'));
			expect(response.status).toBe(200);
			expect(response.headers.get('content-type')).toBe('image/jpeg');
			expect(response.headers.get('cache-control')).toBe('no-store');
			const bytes = new Uint8Array(await response.arrayBuffer());
			expect(isJpeg(bytes)).toBe(true);
			expect(bytes.byteLength).toBeLessThan(2 * 1024 * 1024);
		});

		it('renders the default template when the org has no slots', async () => {
			const response = await GET(event('GET', '7'));
			expect(isJpeg(new Uint8Array(await response.arrayBuffer()))).toBe(true);
		});
	});

	describe('POST', () => {
		const clubPhoto = jpegBytes(640, 360);

		async function render(response: Response): Promise<Buffer> {
			return Buffer.from(await response.arrayBuffer());
		}

		it('renders with the override photo instead of the club photo and stores nothing', async () => {
			imagesFindFirstMock.mockResolvedValue({ contentType: 'image/jpeg', data: clubPhoto });
			const club = await render(await GET(event('GET', '7')));
			const response = await POST(
				event('POST', '7', {
					headers: { authorization: 'Bearer good', 'content-type': 'image/png' },
					body: pngBytes('#00aa00', 256)
				})
			);
			expect(response.status).toBe(200);
			expect(response.headers.get('content-type')).toBe('image/jpeg');
			const overridden = await render(response);
			expect(isJpeg(overridden)).toBe(true);
			expect(overridden.equals(club)).toBe(false);
		});

		it.each([
			['svg', SVG_BYTES],
			['webp', WEBP_BYTES],
			['text', new TextEncoder().encode('not an image')]
		])('returns 400 for an invalid %s override', async (_name, body) => {
			const response = await POST(
				event('POST', '7', {
					headers: { authorization: 'Bearer good', 'content-type': 'image/jpeg' },
					body: body as BodyInit
				})
			);
			expect(response.status).toBe(400);
		});

		it.each([
			['PNG', 'image/png', pngHeader(12000, 12000)],
			['JPEG', 'image/jpeg', withJpegDimensions(markedJpeg(), 6001, 100)]
		])('returns 400 for a small %s override with huge dimensions', async (_name, type, body) => {
			const response = await POST(
				event('POST', '7', { headers: { authorization: 'Bearer good', 'content-type': type }, body })
			);
			expect(response.status).toBe(400);
			expect((await response.json()).error).toContain('24 MP');
		});

		it('returns 400 for an empty override', async () => {
			expect((await POST(event('POST', '7'))).status).toBe(400);
		});

		it('returns 413 for an override over 5 MB', async () => {
			const big = new Uint8Array(MAX + 1);
			big.set(pngBytes());
			const response = await POST(
				event('POST', '7', { headers: { authorization: 'Bearer good', 'content-type': 'image/png' }, body: big })
			);
			expect(response.status).toBe(413);
		});
	});
});
