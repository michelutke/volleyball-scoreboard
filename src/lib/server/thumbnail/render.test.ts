import { describe, it, expect, beforeEach } from 'vitest';
import jpeg from 'jpeg-js';
import { THUMBNAIL_HEIGHT, THUMBNAIL_WIDTH, clearThumbnailCache, renderThumbnail, titleFontSize } from './render';
import { heroCell, turnPatternSvg } from './assets/pattern-turn';
import { SVG_BYTES, WEBP_BYTES, jpegBytes, markedJpeg, pngBytes, pngHeader, withJpegDimensions } from './test-images';

const BASE = { homeTeam: 'VBC Thun', guestTeam: 'Volley Spiez' };

function expectThumbnail(bytes: Uint8Array) {
	expect(bytes[0]).toBe(0xff);
	expect(bytes[1]).toBe(0xd8);
	expect(bytes.byteLength).toBeLessThan(2 * 1024 * 1024);
	const decoded = jpeg.decode(bytes, { useTArray: true });
	expect(decoded.width).toBe(THUMBNAIL_WIDTH);
	expect(decoded.height).toBe(THUMBNAIL_HEIGHT);
}

describe('titleFontSize', () => {
	it('starts at 104 px for a short headline and short team names', async () => {
		expect(await titleFontSize({ headline: 'Cup-Final' })).toBe(104);
		expect(await titleFontSize({ homeTeam: 'VBC', guestTeam: 'Thun' })).toBe(104);
	});

	it('shrinks in 4 px steps for a longer headline', async () => {
		const size = await titleFontSize({ headline: 'Volleyball Turnier Oberland' });
		expect(size).toBeLessThan(104);
		expect(size).toBeGreaterThan(56);
		expect((104 - size) % 4).toBe(0);
	});

	it('stops at 56 px for a headline that never fits', async () => {
		expect(await titleFontSize({ headline: 'x'.repeat(100) })).toBe(56);
	});
});

interface Region {
	left: number;
	right: number;
	top: number;
	bottom: number;
}

type Rgb = [number, number, number];

async function pixelsOf(input: Parameters<typeof renderThumbnail>[0], region: Region): Promise<Rgb[]> {
	const { data, width } = jpeg.decode(await renderThumbnail(input), { useTArray: true });
	const pixels: Rgb[] = [];
	for (let y = region.top; y < region.bottom; y++) {
		for (let x = region.left; x < region.right; x++) {
			const i = (y * width + x) * 4;
			pixels.push([data[i], data[i + 1], data[i + 2]]);
		}
	}
	return pixels;
}

const LOCKUP_REGION: Region = { left: 1050, right: 1200, top: 620, bottom: 665 };
const HERO_CELL: Region = { left: 1112, right: 1208, top: 72, bottom: 168 };
const heroSpot = (cx: number, cy: number): Region => ({ left: HERO_CELL.left + cx - 6, right: HERO_CELL.left + cx + 6, top: HERO_CELL.top + cy - 6, bottom: HERO_CELL.top + cy + 6 });
const HERO_BALL_UPPER_RIGHT = heroSpot(73, 33);
const HERO_BALL_LOWER_LEFT = heroSpot(23, 63);
const HERO_UPPER_LEFT = heroSpot(23, 33);
const HERO_LOWER_RIGHT = heroSpot(73, 63);
const LOGO_CORNER: Region = { left: 72, right: 312, top: 72, bottom: 168 };
const isPaper = ([r, g, b]: Rgb) => r > 225 && g > 225 && b > 215;
const isRed = ([r, g, b]: Rgb) => r > 220 && g < 110 && b < 90;
const brightest = (pixels: Rgb[]) => pixels.reduce((max, p) => Math.max(max, ...p), 0);

describe('lockup clearance', () => {
	beforeEach(() => clearThumbnailCache());

	it('keeps a long headline off the lockup', async () => {
		const short = await pixelsOf({ headline: 'Cup' }, LOCKUP_REGION);
		const long = await pixelsOf({ headline: 'Grosses Volleyball Turnier der Region Oberland' }, LOCKUP_REGION);
		expect(long).toEqual(short);
	});

	it('keeps long team names off the lockup', async () => {
		const short = await pixelsOf({ homeTeam: 'A', guestTeam: 'B' }, LOCKUP_REGION);
		const long = await pixelsOf(
			{ homeTeam: 'Volleyballclub Thun Oberland', guestTeam: 'Volley Smash Spiez Frutigen' },
			LOCKUP_REGION
		);
		expect(long).toEqual(short);
	});
});

describe('title baseline', () => {
	beforeEach(() => clearThumbnailCache());

	async function lowestLightRow(input: Parameters<typeof renderThumbnail>[0], left: number, right: number): Promise<number> {
		const { data, width } = jpeg.decode(await renderThumbnail(input), { useTArray: true });
		for (let y = THUMBNAIL_HEIGHT - 14; y > 400; y--) {
			for (let x = left; x < right; x++) {
				const i = (y * width + x) * 4;
				if (data[i] > 150 && data[i + 1] > 150) return y;
			}
		}
		return -1;
	}

	it.each([
		['short names', { homeTeam: 'VBC', guestTeam: 'Thun' }],
		['long names', { homeTeam: 'Volleyballclub Thun Oberland', guestTeam: 'Volley Smash Spiez Frutigen' }]
	])('sits on the bottom edge of the lockup: %s', async (_name, input) => {
		const lockupBottom = await lowestLightRow(input, 1000, 1208);
		const titleBottom = await lowestLightRow(input, 72, 600);
		expect(Math.abs(titleBottom - lockupBottom)).toBeLessThanOrEqual(2);
	});
});

describe('heroCell', () => {
	it('sits 72 px from the top and right edge', () => {
		expect(heroCell(THUMBNAIL_WIDTH)).toEqual({ x: 1112, y: 72, size: 96 });
	});

	it('is an upright cell of the shifted pattern grid', () => {
		const svg = turnPatternSvg(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, { tone: '#161616', heroBlock: '#f5f3ee', heroBall: '#ff3d2e' }, { solidUntil: 168, goneFrom: 360 });
		expect(svg).toContain('<pattern id="turn" x="140" y="60"');
		expect(svg).toContain('translate(1112 72) scale(0.48)">');
		expect(svg).not.toContain('translate(1112 72) scale(0.48) rotate');
	});
});

describe('redesigned template', () => {
	beforeEach(() => clearThumbnailCache());

	const WHITE_PHOTO = pngBytes('#ffffff', 256);
	const inputs = {
		'match without photo': BASE,
		'headline without photo': { headline: 'Cup-Final VBC Thun' },
		'match with photo and logo': { ...BASE, photo: WHITE_PHOTO, logo: pngBytes('#1d4ed8', 64) },
		'headline with photo': { headline: 'Cup-Final VBC Thun', photo: WHITE_PHOTO }
	};

	it.each(Object.entries(inputs))('draws the Scorely mark as a pattern cell top right: %s', async (_name, input) => {
		const pixels = await pixelsOf(input, HERO_CELL);
		expect(pixels.filter(isPaper).length).toBeGreaterThan(2500);
		expect(pixels.filter(isRed).length).toBeGreaterThan(500);
	});

	it.each(Object.entries(inputs))('draws the mark upright, balls at the upper right and lower left: %s', async (_name, input) => {
		const redShare = async (region: Region) => (await pixelsOf(input, region)).filter(isRed).length;
		expect(await redShare(HERO_BALL_UPPER_RIGHT)).toBeGreaterThan(100);
		expect(await redShare(HERO_BALL_LOWER_LEFT)).toBeGreaterThan(100);
		expect(await redShare(HERO_UPPER_LEFT)).toBe(0);
		expect(await redShare(HERO_LOWER_RIGHT)).toBe(0);
	});

	it('shows nothing top left without a club logo, not even the Scorely mark', async () => {
		expect(brightest(await pixelsOf(BASE, LOGO_CORNER))).toBeLessThan(60);
		expect(brightest(await pixelsOf({ headline: 'Cup', photo: null }, LOGO_CORNER))).toBeLessThan(60);
	});

	it('draws the club logo top left without a box', async () => {
		const pixels = await pixelsOf({ ...BASE, logo: pngBytes('#ffffff', 64) }, LOGO_CORNER);
		const light = pixels.filter(isPaper).length;
		expect(light).toBeGreaterThan(8000);
		expect(light).toBeLessThan(10000);
	});

	it('scales a wide club logo to 240 px wide and a tall one to 96 px high', async () => {
		const wide = await pixelsOf({ ...BASE, logo: pngBytes('#ffffff', 600, 100) }, LOGO_CORNER);
		const wideLight = wide.filter(isPaper).length;
		expect(wideLight).toBeGreaterThan(240 * 40 * 0.95);
		expect(wideLight).toBeLessThan(240 * 40 * 1.05);
		const beside: Region = { left: 72 + 240 + 8, right: 72 + 240 + 100, top: 72, bottom: 168 };
		expect(brightest(await pixelsOf({ ...BASE, logo: pngBytes('#ffffff', 600, 100) }, beside))).toBeLessThan(60);
		const tall = await pixelsOf({ ...BASE, logo: pngBytes('#ffffff', 100, 600) }, LOGO_CORNER);
		const tallLight = tall.filter(isPaper).length;
		expect(tallLight).toBeGreaterThan(16 * 96 * 0.9);
		expect(tallLight).toBeLessThan(16 * 96 * 1.1);
	});

	it('shows the pattern over a photo in the top half and the plain photo below', async () => {
		const top = await pixelsOf({ ...BASE, photo: WHITE_PHOTO }, { left: 300, right: 900, top: 20, bottom: 100 });
		expect(top.reduce((min, p) => Math.min(min, p[0]), 255)).toBeLessThan(40);
		const lower = await pixelsOf({ ...BASE, photo: WHITE_PHOTO }, { left: 700, right: 1000, top: 380, bottom: 440 });
		expect(lower.reduce((min, p) => Math.min(min, p[0]), 255)).toBeGreaterThan(60);
	});

	it('fades the pattern out by the vertical middle without a photo', async () => {
		const below = await pixelsOf(BASE, { left: 0, right: 1280, top: 380, bottom: 480 });
		expect(brightest(below)).toBeLessThan(16);
		const above = await pixelsOf(BASE, { left: 0, right: 1000, top: 20, bottom: 100 });
		expect(brightest(above)).toBeGreaterThan(18);
	});
});

describe('emoji', () => {
	beforeEach(() => clearThumbnailCache());

	it('are dropped from headline and team names instead of rendering as boxes', async () => {
		const plain = await renderThumbnail({ headline: 'Cup-Final VBC Thun' });
		const emoji = await renderThumbnail({ headline: 'Cup-Final \u{1F3D0}\u{1F525} VBC Thun' });
		expect(Buffer.from(emoji).equals(Buffer.from(plain))).toBe(true);
		const match = await renderThumbnail({ ...BASE, homeTeam: 'VBC \u{1F3D0} Thun', guestTeam: 'Volley\u200D\uFE0F Spiez' });
		expect(Buffer.from(match).equals(Buffer.from(await renderThumbnail({ ...BASE, homeTeam: 'VBC Thun' })))).toBe(true);
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

	it('renders very long team names', async () => {
		const bytes = await renderThumbnail({
			homeTeam: 'Volleyballclub Thun Oberland Mittelland Nord',
			guestTeam: 'Volley Smash Spiez Frutigen Interlaken Süd'
		});
		expectThumbnail(bytes);
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
	const HEADLINE = { headline: 'Cup-Final VBC Thun' };

	beforeEach(() => clearThumbnailCache());

	it('renders the headline', async () => {
		expectThumbnail(await renderThumbnail(HEADLINE));
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
		const headline = await renderThumbnail({ headline: 'VBC Thun' });
		const match = await renderThumbnail({ homeTeam: 'VBC Thun', guestTeam: '' });
		expect(headline).not.toBe(match);
	});
});
