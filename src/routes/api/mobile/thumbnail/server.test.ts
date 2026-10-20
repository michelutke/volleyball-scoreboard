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
const getBillingStatusMock = vi.hoisted(() => vi.fn());
const envMock = vi.hoisted(() => ({ STRIPE_SECRET_KEY: 'sk_test' }));
const settingsFindFirstMock = vi.hoisted(() => vi.fn());
const imagesFindFirstMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/mobile-auth', () => ({ verifyMobileToken: verifyMobileTokenMock }));
vi.mock('$lib/server/billing', () => ({ getBillingStatus: getBillingStatusMock }));
vi.mock('$env/dynamic/private', () => ({ env: envMock }));
vi.mock('$lib/server/db/index.js', () => ({
	db: { query: { settings: { findFirst: settingsFindFirstMock }, orgImages: { findFirst: imagesFindFirstMock } } }
}));

const { GET, POST } = await import('./+server.js');

const IDENTITY = { orgId: 'org-1', sub: 'user-1', roles: [] };
const MAX = 5 * 1024 * 1024;
const SCHEDULED = '2026-10-24T15:30:00Z';

function event(
	method: 'GET' | 'POST',
	query: string,
	options: { headers?: Record<string, string>; body?: BodyInit | null } = {}
) {
	const headers = options.headers ?? { authorization: 'Bearer good' };
	const url = new URL(`https://scorely.ch/api/mobile/thumbnail${query}`);
	return {
		url,
		request: new Request(url, { method, headers, body: options.body ?? null })
	} as unknown as Parameters<typeof GET>[0];
}

function isJpeg(bytes: Uint8Array): boolean {
	return bytes[0] === 0xff && bytes[1] === 0xd8;
}

function titled(title: string, scheduledAt: string | null = SCHEDULED): string {
	const params = new URLSearchParams({ title });
	if (scheduledAt !== null) params.set('scheduledAt', scheduledAt);
	return `?${params}`;
}

describe('mobile titled thumbnail', () => {
	beforeEach(() => {
		verifyMobileTokenMock.mockReset().mockResolvedValue(IDENTITY);
		getBillingStatusMock.mockReset().mockResolvedValue('allowed');
		settingsFindFirstMock.mockReset().mockResolvedValue(undefined);
		imagesFindFirstMock.mockReset().mockResolvedValue(undefined);
	});

	describe.each([
		['GET', GET],
		['POST', POST]
	] as const)('%s auth and query', (method, handler) => {
		const query = titled('Cup-Final VBC Thun');

		it('returns 401 without Authorization header', async () => {
			expect((await handler(event(method, query, { headers: {} }))).status).toBe(401);
		});

		it('returns 401 when the token fails verification', async () => {
			verifyMobileTokenMock.mockResolvedValue(null);
			expect((await handler(event(method, query))).status).toBe(401);
		});

		it('passes the 402 of a blocked subscription through', async () => {
			getBillingStatusMock.mockResolvedValue('blocked');
			expect((await handler(event(method, query))).status).toBe(402);
		});

		it('returns 400 for a missing title', async () => {
			expect((await handler(event(method, ''))).status).toBe(400);
		});

		it.each([['empty', ''], ['blank', '   '], ['zero-width only', '\u200B\u200D\uFEFF'], ['too long', 'x'.repeat(101)]])('returns 400 for a %s title', async (_name, title) => {
			expect((await handler(event(method, titled(title)))).status).toBe(400);
		});
	});

	describe('GET', () => {
		it('renders a JPEG with the club slots of the org', async () => {
			settingsFindFirstMock.mockResolvedValue({ value: '#1d4ed8' });
			imagesFindFirstMock.mockResolvedValue({ contentType: 'image/jpeg', data: jpegBytes(640, 360) });
			const response = await GET(event('GET', titled('Cup-Final VBC Thun')));
			expect(response.status).toBe(200);
			expect(response.headers.get('content-type')).toBe('image/jpeg');
			expect(response.headers.get('cache-control')).toBe('no-store');
			const bytes = new Uint8Array(await response.arrayBuffer());
			expect(isJpeg(bytes)).toBe(true);
			expect(bytes.byteLength).toBeLessThan(2 * 1024 * 1024);
		});

		it('renders without scheduledAt and trims the title', async () => {
			const response = await GET(event('GET', titled('  Training  ', null)));
			expect(response.status).toBe(200);
			expect(isJpeg(new Uint8Array(await response.arrayBuffer()))).toBe(true);
		});

		it.each([['valid', SCHEDULED], ['garbage', 'tomorrow'], ['empty', ''], ['no timezone', '2026-10-24T17:30:00']])(
			'accepts and ignores a %s scheduledAt',
			async (_name, scheduledAt) => {
				const plain = Buffer.from(await (await GET(event('GET', titled('Cup-Final', null)))).arrayBuffer());
				const response = await GET(event('GET', titled('Cup-Final', scheduledAt)));
				expect(response.status).toBe(200);
				expect(Buffer.from(await response.arrayBuffer()).equals(plain)).toBe(true);
			}
		);

		it('accepts a title of exactly 100 characters', async () => {
			expect((await GET(event('GET', titled('x'.repeat(100))))).status).toBe(200);
		});

		it('counts code points, not UTF-16 units', async () => {
			expect((await GET(event('GET', titled('\u{1F3D0}'.repeat(100))))).status).toBe(200);
			expect((await GET(event('GET', titled('\u{1F3D0}'.repeat(101))))).status).toBe(400);
		});
	});

	describe('POST', () => {
		const query = titled('Cup-Final VBC Thun');

		async function render(response: Response): Promise<Buffer> {
			return Buffer.from(await response.arrayBuffer());
		}

		it('renders with the override photo instead of the club photo and stores nothing', async () => {
			imagesFindFirstMock.mockResolvedValue({ contentType: 'image/jpeg', data: jpegBytes(640, 360) });
			const club = await render(await GET(event('GET', query)));
			const response = await POST(
				event('POST', query, {
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
				event('POST', query, { headers: { authorization: 'Bearer good', 'content-type': 'image/jpeg' }, body: body as BodyInit })
			);
			expect(response.status).toBe(400);
		});

		it.each([
			['PNG', 'image/png', pngHeader(12000, 12000)],
			['JPEG', 'image/jpeg', withJpegDimensions(markedJpeg(), 6001, 100)]
		])('returns 400 for a small %s override with huge dimensions', async (_name, type, body) => {
			const response = await POST(event('POST', query, { headers: { authorization: 'Bearer good', 'content-type': type }, body }));
			expect(response.status).toBe(400);
			expect((await response.json()).error).toContain('24 MP');
		});

		it('returns 400 for an empty override', async () => {
			expect((await POST(event('POST', query))).status).toBe(400);
		});

		it('returns 413 for an override over 5 MB', async () => {
			const big = new Uint8Array(MAX + 1);
			big.set(pngBytes());
			const response = await POST(
				event('POST', query, { headers: { authorization: 'Bearer good', 'content-type': 'image/png' }, body: big })
			);
			expect(response.status).toBe(413);
		});
	});
});
