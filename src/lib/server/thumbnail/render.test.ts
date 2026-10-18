import { describe, it, expect, beforeEach } from 'vitest';
import jpeg from 'jpeg-js';
import { THUMBNAIL_HEIGHT, THUMBNAIL_WIDTH, clearThumbnailCache, formatMatchLine, renderThumbnail } from './render';
import { SVG_BYTES, WEBP_BYTES, jpegBytes, markedJpeg, pngBytes, pngHeader, withJpegDimensions } from './test-images';

const SATURDAY = new Date('2026-10-24T15:30:00Z');
const BASE = { homeTeam: 'VBC Thun', guestTeam: 'Volley Spiez', scheduledAt: SATURDAY, venue: 'Spiez Arena' };

function expectThumbnail(bytes: Uint8Array) {
	expect(bytes[0]).toBe(0xff);
	expect(bytes[1]).toBe(0xd8);
	expect(bytes.byteLength).toBeLessThan(2 * 1024 * 1024);
	const decoded = jpeg.decode(bytes, { useTArray: true });
	expect(decoded.width).toBe(THUMBNAIL_WIDTH);
	expect(decoded.height).toBe(THUMBNAIL_HEIGHT);
}

describe('formatMatchLine', () => {
	it('formats weekday, Swiss date, time and upper case venue in Swiss time', () => {
		expect(formatMatchLine(SATURDAY, 'Spiez Arena')).toBe('SA 24.10.2026 · 17:30 · SPIEZ ARENA');
	});

	it('uses winter time outside daylight saving', () => {
		expect(formatMatchLine(new Date('2026-12-05T16:30:00Z'), null)).toBe('SA 05.12.2026 · 17:30');
	});

	it('skips missing parts', () => {
		expect(formatMatchLine(null, 'Lachen')).toBe('LACHEN');
		expect(formatMatchLine(SATURDAY, '  ')).toBe('SA 24.10.2026 · 17:30');
		expect(formatMatchLine(null, null)).toBe('');
	});
});

describe('renderThumbnail', () => {
	beforeEach(() => clearThumbnailCache());

	it('renders the default template without photo and logo', async () => {
		expectThumbnail(await renderThumbnail(BASE));
	});

	it('renders with photo and logo', async () => {
		expectThumbnail(await renderThumbnail({ ...BASE, photo: jpegBytes(1920, 1080), logo: pngBytes(), clubColor: '#1d4ed8' }));
	});

	it('renders very long team names and venue', async () => {
		const bytes = await renderThumbnail({
			homeTeam: 'Volleyballclub Thun Oberland Mittelland Nord',
			guestTeam: 'Volley Smash Spiez Frutigen Interlaken Süd',
			scheduledAt: SATURDAY,
			venue: 'Mehrzweckhalle Allmendingen bei Thun am See'
		});
		expectThumbnail(bytes);
	});

	it('renders without date and venue', async () => {
		expectThumbnail(await renderThumbnail({ ...BASE, scheduledAt: null, venue: null }));
	});

	it('renders markup in team names as plain text', async () => {
		const bytes = await renderThumbnail({
			...BASE,
			homeTeam: '</text><rect width="1280" height="720" fill="red"/>',
			guestTeam: '<script>alert(1)</script>'
		});
		expectThumbnail(bytes);
	});

	it('falls back to the default colour for an invalid club colour', async () => {
		const invalid = await renderThumbnail({ ...BASE, clubColor: 'red;}</style>' });
		const fallback = await renderThumbnail({ ...BASE, clubColor: '#ff3d2e' });
		expect(Buffer.from(invalid).equals(Buffer.from(fallback))).toBe(true);
	});

	it('ignores slot images that are not JPEG or PNG', async () => {
		const plain = await renderThumbnail(BASE);
		for (const bogus of [WEBP_BYTES, SVG_BYTES, new Uint8Array([1, 2, 3])]) {
			const bytes = await renderThumbnail({ ...BASE, photo: bogus, logo: bogus });
			expect(Buffer.from(bytes).equals(Buffer.from(plain))).toBe(true);
		}
	});

	it('ignores stored slot images with oversize pixel dimensions instead of decoding them', async () => {
		const plain = await renderThumbnail(BASE);
		for (const huge of [pngHeader(12000, 12000), withJpegDimensions(markedJpeg(), 7000, 7000)]) {
			const bytes = await renderThumbnail({ ...BASE, photo: huge, logo: huge });
			expect(Buffer.from(bytes).equals(Buffer.from(plain))).toBe(true);
		}
	});

	it('serves repeated inputs from the cache and re-renders when an input changes', async () => {
		const first = await renderThumbnail(BASE);
		expect(await renderThumbnail({ ...BASE })).toBe(first);
		expect(await renderThumbnail({ ...BASE, guestTeam: 'Volley Bern' })).not.toBe(first);
	});
});
