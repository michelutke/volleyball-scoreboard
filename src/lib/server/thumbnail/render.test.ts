import { describe, it, expect, beforeEach } from 'vitest';
import jpeg from 'jpeg-js';
import { THUMBNAIL_HEIGHT, THUMBNAIL_WIDTH, clearThumbnailCache, formatMatchLine, renderThumbnail, titleFontSize } from './render';
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

describe('titleFontSize', () => {
	it('starts at 104 px for a short headline and short team names', async () => {
		expect(await titleFontSize({ headline: 'Cup-Final VBC Thun', scheduledAt: SATURDAY })).toBe(104);
		expect(await titleFontSize({ homeTeam: 'VBC', guestTeam: 'Thun', scheduledAt: SATURDAY, venue: null })).toBe(104);
	});

	it('shrinks in 4 px steps for a longer headline', async () => {
		const size = await titleFontSize({ headline: 'Grosses Volleyball Turnier Oberland', scheduledAt: SATURDAY });
		expect(size).toBeLessThan(104);
		expect(size).toBeGreaterThan(56);
		expect((104 - size) % 4).toBe(0);
	});

	it('is smaller without a date line, where the title must stay left of the lockup', async () => {
		const headline = 'Grosses Volleyball Turnier Oberland';
		const withDate = await titleFontSize({ headline, scheduledAt: SATURDAY });
		const withoutDate = await titleFontSize({ headline, scheduledAt: null });
		expect(withoutDate).toBeLessThan(withDate);
	});

	it('stops at 56 px for a headline that never fits', async () => {
		expect(await titleFontSize({ headline: 'x'.repeat(100), scheduledAt: null })).toBe(56);
	});
});

const LOCKUP_REGION = { left: 1050, right: 1200, top: 620, bottom: 665 };

function lockupPixels(bytes: Uint8Array): number[] {
	const { data, width } = jpeg.decode(bytes, { useTArray: true });
	const pixels: number[] = [];
	for (let y = LOCKUP_REGION.top; y < LOCKUP_REGION.bottom; y++) {
		for (let x = LOCKUP_REGION.left; x < LOCKUP_REGION.right; x++) pixels.push(data[(y * width + x) * 4]);
	}
	return pixels;
}

describe('lockup clearance without a date line', () => {
	beforeEach(() => clearThumbnailCache());

	it('keeps a long headline off the lockup', async () => {
		const short = lockupPixels(await renderThumbnail({ headline: 'Cup', scheduledAt: null }));
		const long = lockupPixels(await renderThumbnail({ headline: 'Grosses Volleyball Turnier der Region Oberland', scheduledAt: null }));
		expect(long).toEqual(short);
	});

	it('keeps long team names off the lockup', async () => {
		const short = lockupPixels(await renderThumbnail({ homeTeam: 'A', guestTeam: 'B', scheduledAt: null, venue: null }));
		const long = lockupPixels(
			await renderThumbnail({ homeTeam: 'Volleyballclub Thun Oberland', guestTeam: 'Volley Smash Spiez Frutigen', scheduledAt: null, venue: null })
		);
		expect(long).toEqual(short);
	});
});

describe('emoji', () => {
	beforeEach(() => clearThumbnailCache());

	it('are dropped from headline, team names and venue instead of rendering as boxes', async () => {
		const plain = await renderThumbnail({ headline: 'Cup-Final VBC Thun', scheduledAt: SATURDAY });
		const emoji = await renderThumbnail({ headline: 'Cup-Final \u{1F3D0}\u{1F525} VBC Thun', scheduledAt: SATURDAY });
		expect(Buffer.from(emoji).equals(Buffer.from(plain))).toBe(true);
		const match = await renderThumbnail({ ...BASE, homeTeam: 'VBC \u{1F3D0} Thun', guestTeam: 'Volley\u200D\uFE0F Spiez', venue: 'Spiez Arena \u{1F525}' });
		expect(Buffer.from(match).equals(Buffer.from(await renderThumbnail({ ...BASE, homeTeam: 'VBC Thun' })))).toBe(true);
	});

	it('leave no date line part for an emoji-only venue', () => {
		expect(formatMatchLine(null, '\u{1F525}')).toBe('');
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

describe('renderThumbnail headline mode', () => {
	const HEADLINE = { headline: 'Cup-Final VBC Thun', scheduledAt: SATURDAY };

	beforeEach(() => clearThumbnailCache());

	it('renders the headline with the planned date', async () => {
		expectThumbnail(await renderThumbnail(HEADLINE));
	});

	it('renders without a date', async () => {
		expectThumbnail(await renderThumbnail({ ...HEADLINE, scheduledAt: null }));
	});

	it('renders a headline of 100 characters with ellipsis', async () => {
		expectThumbnail(await renderThumbnail({ ...HEADLINE, headline: 'Grosses Volleyball Turnier der Region Oberland '.repeat(3).slice(0, 100), photo: jpegBytes(1920, 1080) }));
	});

	it('renders markup in the headline as plain text', async () => {
		expectThumbnail(await renderThumbnail({ ...HEADLINE, headline: '<script>alert(1)</script>' }));
	});

	it('differs from the match template and between headlines', async () => {
		const headline = await renderThumbnail(HEADLINE);
		expect(Buffer.from(headline).equals(Buffer.from(await renderThumbnail(BASE)))).toBe(false);
		expect(Buffer.from(headline).equals(Buffer.from(await renderThumbnail({ ...HEADLINE, headline: 'Training' })))).toBe(false);
	});

	it('does not mix up a headline with a match of the same text', async () => {
		const headline = await renderThumbnail({ headline: 'VBC Thun', scheduledAt: null });
		const match = await renderThumbnail({ homeTeam: 'VBC Thun', guestTeam: '', scheduledAt: null, venue: null });
		expect(headline).not.toBe(match);
	});
});
