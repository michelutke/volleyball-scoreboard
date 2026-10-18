import { createHash } from 'node:crypto';
import { LRUCache } from 'lru-cache';
import satori from 'satori';
import type { SatoriNode } from 'satori';
import { renderAsync } from '@resvg/resvg-js';
import jpeg from 'jpeg-js';
import { isDecodableSize, readImageDimensions } from '../image-dimensions';
import { sniffImageType } from '../image-proxy';
import inter400 from './fonts/inter_400.ttf?inline';
import inter780 from './fonts/inter_780.ttf?inline';
import mono500 from './fonts/jetbrains-mono-500.woff?inline';
import markSvg from './assets/mark.svg?raw';
import lockupSvg from './assets/lockup-horizontal-on-ink.svg?raw';
import { turnPatternSvg } from './assets/pattern-turn';

export const THUMBNAIL_WIDTH = 1280;
export const THUMBNAIL_HEIGHT = 720;
export const THUMBNAIL_QUALITY = 85;

const INK = '#0a0a0a';
const PAPER = '#f5f3ee';
const GREY_300 = '#c8c5bd';
const GREY_900 = '#161616';
export const PULSE_RED = '#ff3d2e';

const MARGIN_X = 72;
const CONTENT_WIDTH = THUMBNAIL_WIDTH - 2 * MARGIN_X;
const BAR_HEIGHT = 12;
const BLOCK_BOTTOM = BAR_HEIGHT + 40;
const LOGO_BOX = 96;
const LOGO_PADDING = 16;
const LOCKUP_HEIGHT = 52;
const LOCKUP_WIDTH = Math.round((LOCKUP_HEIGHT * 762.39) / 240);
const DATE_LINE_FONT_SIZE = 34;
const DATE_LINE_HEIGHT = 40;
const DATE_LINE_MAX_WIDTH = THUMBNAIL_WIDTH - 2 * MARGIN_X - LOCKUP_WIDTH - 24;
const TITLE_MAX_SIZE = 104;
const TITLE_MIN_SIZE = 56;
const TITLE_STEP = 4;
const TITLE_GAP = 20;

const EMBEDDABLE_TYPES = new Set(['image/jpeg', 'image/png']);

export interface ThumbnailInput {
	homeTeam: string;
	guestTeam: string;
	scheduledAt: Date | null;
	venue: string | null;
	clubColor?: string | null;
	photo?: Uint8Array | null;
	logo?: Uint8Array | null;
}

function dataUrl(mime: string, bytes: Uint8Array | Buffer): string {
	return `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`;
}

function inlineAsset(url: string): Buffer {
	return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
}

const FONTS = [
	{ name: 'Inter', data: inlineAsset(inter400), weight: 400 as const, style: 'normal' as const },
	{ name: 'Inter', data: inlineAsset(inter780), weight: 800 as const, style: 'normal' as const },
	{ name: 'Mono', data: inlineAsset(mono500), weight: 400 as const, style: 'normal' as const }
];

const MARK_URL = dataUrl('image/svg+xml', Buffer.from(markSvg));
const LOCKUP_URL = dataUrl('image/svg+xml', Buffer.from(lockupSvg));
const PATTERN_URL = dataUrl('image/svg+xml', Buffer.from(turnPatternSvg(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, GREY_900, INK)));

type Element = { type: string; props: Record<string, unknown> };

function el(type: string, style: Record<string, unknown>, children?: unknown, extra: Record<string, unknown> = {}): Element {
	return { type, props: { ...extra, style: { display: 'flex', ...style }, children } };
}

function embeddableImage(bytes: Uint8Array | null | undefined): string | null {
	if (!bytes) return null;
	const type = sniffImageType(bytes);
	if (!type || !EMBEDDABLE_TYPES.has(type) || !isDecodableSize(readImageDimensions(bytes))) return null;
	return dataUrl(type, bytes);
}

function image(src: string, style: Record<string, unknown>): Element {
	return { type: 'img', props: { src, width: style.width, height: style.height, style } };
}

const WEEKDAYS: Record<string, string> = {
	Mon: 'MO',
	Tue: 'DI',
	Wed: 'MI',
	Thu: 'DO',
	Fri: 'FR',
	Sat: 'SA',
	Sun: 'SO'
};

const ZURICH_PARTS = new Intl.DateTimeFormat('en-GB', {
	timeZone: 'Europe/Zurich',
	weekday: 'short',
	day: '2-digit',
	month: '2-digit',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23'
});

/** `SA 24.10.2026 · 17:30 · SPIEZ ARENA` in Swiss time; missing parts are skipped. */
export function formatMatchLine(scheduledAt: Date | null, venue: string | null): string {
	const parts: string[] = [];
	if (scheduledAt && !Number.isNaN(scheduledAt.getTime())) {
		const p = Object.fromEntries(ZURICH_PARTS.formatToParts(scheduledAt).map((x) => [x.type, x.value]));
		parts.push(`${WEEKDAYS[p.weekday] ?? ''} ${p.day}.${p.month}.${p.year}`.trim(), `${p.hour}:${p.minute}`);
	}
	const place = venue?.trim();
	if (place) parts.push(place.toLocaleUpperCase('de-CH'));
	return parts.join(' · ');
}

function normalizeColor(color: string | null | undefined): string {
	return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : PULSE_RED;
}

function teamName(name: string): string {
	return name.trim().replace(/\s+/g, ' ').toLocaleUpperCase('de-CH');
}

function titleRow(home: string, guest: string, size: number, constrained: boolean): Element {
	const name = (text: string): Element =>
		el(
			'div',
			{
				fontFamily: 'Inter',
				fontWeight: 800,
				fontSize: size,
				lineHeight: 1,
				color: PAPER,
				whiteSpace: 'nowrap',
				...(constrained ? { overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 1, minWidth: 0 } : {})
			},
			text
		);
	const vs = el(
		'div',
		{ fontFamily: 'Inter', fontWeight: 400, fontSize: Math.round(size * 0.6), lineHeight: 1, color: PAPER, flexShrink: 0 },
		'vs'
	);
	return el(
		'div',
		{
			flexDirection: 'row',
			alignItems: 'baseline',
			gap: Math.round(size * 0.3),
			...(constrained ? { width: CONTENT_WIDTH } : {})
		},
		[name(home), vs, name(guest)],
		{ 'data-title': true }
	);
}

async function measureTitle(home: string, guest: string, size: number): Promise<number> {
	let width = Infinity;
	await satori(titleRow(home, guest, size, false) as never, {
		width: 8000,
		height: size * 2,
		fonts: FONTS,
		onNodeDetected: (node: SatoriNode) => {
			if (node.props['data-title']) width = node.width;
		}
	});
	return width;
}

async function fitTitle(home: string, guest: string): Promise<Element> {
	for (let size = TITLE_MAX_SIZE; size >= TITLE_MIN_SIZE; size -= TITLE_STEP) {
		if ((await measureTitle(home, guest, size)) <= CONTENT_WIDTH) return titleRow(home, guest, size, false);
	}
	return titleRow(home, guest, TITLE_MIN_SIZE, true);
}

function livePill(): Element {
	return el(
		'div',
		{
			position: 'absolute',
			right: MARGIN_X,
			top: 56,
			height: 56,
			padding: '0 28px',
			borderRadius: 28,
			backgroundColor: PULSE_RED,
			alignItems: 'center',
			gap: 12
		},
		[
			el('div', { width: 14, height: 14, borderRadius: 7, backgroundColor: PAPER }),
			el('div', { fontFamily: 'Inter', fontWeight: 800, fontSize: 28, letterSpacing: 2.24, color: INK, lineHeight: 1 }, 'LIVE')
		]
	);
}

function logoSquare(logoUrl: string | null): Element {
	const size = LOGO_BOX + 2 * LOGO_PADDING;
	return el(
		'div',
		{ position: 'absolute', left: MARGIN_X, top: 56, width: size, height: size, padding: LOGO_PADDING, backgroundColor: PAPER },
		[image(logoUrl ?? MARK_URL, { width: LOGO_BOX, height: LOGO_BOX, objectFit: 'contain' })]
	);
}

async function buildTree(input: ThumbnailInput): Promise<Element> {
	const photoUrl = embeddableImage(input.photo);
	const logoUrl = embeddableImage(input.logo);
	const matchLine = formatMatchLine(input.scheduledAt, input.venue);
	const title = await fitTitle(teamName(input.homeTeam), teamName(input.guestTeam));

	const children: Element[] = [];
	if (photoUrl) {
		children.push(
			image(photoUrl, { position: 'absolute', left: 0, top: 0, width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT, objectFit: 'cover' }),
			el('div', { position: 'absolute', left: 0, top: 0, width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT, backgroundColor: 'rgba(10,10,10,0.6)' }),
			el('div', {
				position: 'absolute',
				left: 0,
				top: 0,
				width: THUMBNAIL_WIDTH,
				height: THUMBNAIL_HEIGHT,
				backgroundImage: 'linear-gradient(45deg, rgba(10,10,10,0.9) 0%, rgba(10,10,10,0) 70%)'
			})
		);
	}
	if (!photoUrl) {
		children.push(
			image(PATTERN_URL, { position: 'absolute', left: 0, top: 0, width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT })
		);
	}
	children.push(
		el('div', {
			position: 'absolute',
			left: 0,
			bottom: 0,
			width: THUMBNAIL_WIDTH,
			height: BAR_HEIGHT,
			backgroundColor: normalizeColor(input.clubColor)
		}),
		logoSquare(logoUrl),
		livePill(),
		image(LOCKUP_URL, { position: 'absolute', right: MARGIN_X, bottom: BLOCK_BOTTOM, width: LOCKUP_WIDTH, height: LOCKUP_HEIGHT }),
		el(
			'div',
			{ position: 'absolute', left: MARGIN_X, bottom: BLOCK_BOTTOM, flexDirection: 'column', gap: TITLE_GAP },
			[
				title,
				...(matchLine
					? [
							el(
								'div',
								{
									fontFamily: 'Mono',
									fontSize: DATE_LINE_FONT_SIZE,
									lineHeight: 1,
									height: DATE_LINE_HEIGHT,
									maxWidth: DATE_LINE_MAX_WIDTH,
									color: GREY_300,
									whiteSpace: 'nowrap',
									overflow: 'hidden',
									textOverflow: 'ellipsis'
								},
								matchLine
							)
						]
					: [])
			]
		)
	);

	return el(
		'div',
		{ position: 'relative', width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT, backgroundColor: INK },
		children
	);
}

async function renderUncached(input: ThumbnailInput): Promise<Uint8Array<ArrayBuffer>> {
	const svg = await satori((await buildTree(input)) as never, {
		width: THUMBNAIL_WIDTH,
		height: THUMBNAIL_HEIGHT,
		fonts: FONTS
	});
	const rendered = await renderAsync(svg, {
		fitTo: { mode: 'width', value: THUMBNAIL_WIDTH },
		background: INK,
		font: { loadSystemFonts: false }
	});
	const encoded = jpeg.encode(
		{ data: rendered.pixels, width: rendered.width, height: rendered.height },
		THUMBNAIL_QUALITY
	);
	return new Uint8Array(encoded.data);
}

const cache = new LRUCache<string, Uint8Array<ArrayBuffer>>({ max: 32 });

function sha256(bytes: Uint8Array | null | undefined): string {
	return bytes ? createHash('sha256').update(bytes).digest('hex') : '';
}

function cacheKey(input: ThumbnailInput): string {
	return createHash('sha256')
		.update(
			JSON.stringify([
				input.homeTeam,
				input.guestTeam,
				input.scheduledAt?.getTime() ?? null,
				input.venue,
				normalizeColor(input.clubColor),
				sha256(input.photo),
				sha256(input.logo)
			])
		)
		.digest('hex');
}

/** 1280 x 720 JPEG of the Scorely stream thumbnail template. Team names and venue are rendered as text only. */
export async function renderThumbnail(input: ThumbnailInput): Promise<Uint8Array<ArrayBuffer>> {
	const key = cacheKey(input);
	const hit = cache.get(key);
	if (hit) return hit;
	const jpegBytes = await renderUncached(input);
	cache.set(key, jpegBytes);
	return jpegBytes;
}

export function clearThumbnailCache(): void {
	cache.clear();
}
