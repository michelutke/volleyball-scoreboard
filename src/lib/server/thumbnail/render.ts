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
import lockupSvg from './assets/lockup-horizontal-on-ink.svg?raw';
import { heroCell, logoScrimSvg, turnPatternSvg } from './assets/pattern-turn';

export const THUMBNAIL_WIDTH = 1280;
export const THUMBNAIL_HEIGHT = 720;
export const THUMBNAIL_QUALITY = 85;

const INK = '#0a0a0a';
const PAPER = '#f5f3ee';
const GREY_300 = '#c8c5bd';
const PATTERN_TONE = '#161616';
export const PULSE_RED = '#ff3d2e';

const MARGIN_X = 72;
const CONTENT_WIDTH = THUMBNAIL_WIDTH - 2 * MARGIN_X;
const BAR_HEIGHT = 12;
const BLOCK_BOTTOM = BAR_HEIGHT + 40;
const LOGO_TOP = 72;
const LOGO_MAX_HEIGHT = 96;
const LOGO_MAX_WIDTH = 240;
const LOGO_SCRIM_WIDTH = 420;
const LOGO_SCRIM_HEIGHT = 300;
const LOGO_SCRIM_OPACITY = 0.75;
const PATTERN_GONE_FROM = THUMBNAIL_HEIGHT / 2;
const LOCKUP_HEIGHT = 52;
const LOCKUP_WIDTH = Math.round((LOCKUP_HEIGHT * 762.39) / 240);
const DATE_LINE_FONT_SIZE = 34;
const DATE_LINE_HEIGHT = 40;
const DATE_LINE_MAX_WIDTH = THUMBNAIL_WIDTH - 2 * MARGIN_X - LOCKUP_WIDTH - 24;
const TITLE_WIDTH_BESIDE_LOCKUP = CONTENT_WIDTH - LOCKUP_WIDTH - 24;
const TITLE_MAX_SIZE = 104;
const TITLE_MIN_SIZE = 56;
const TITLE_STEP = 4;
const TITLE_GAP = 20;
const DESCENDER_ROOM = 12;

const EMBEDDABLE_TYPES = new Set(['image/jpeg', 'image/png']);

interface ThumbnailSlots {
	scheduledAt: Date | null;
	clubColor?: string | null;
	photo?: Uint8Array | null;
	logo?: Uint8Array | null;
}

export interface MatchThumbnailInput extends ThumbnailSlots {
	homeTeam: string;
	guestTeam: string;
	venue: string | null;
}

export interface HeadlineThumbnailInput extends ThumbnailSlots {
	headline: string;
}

export type ThumbnailInput = MatchThumbnailInput | HeadlineThumbnailInput;

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

const LOCKUP_URL = dataUrl('image/svg+xml', Buffer.from(lockupSvg));
const HERO_CELL = heroCell(THUMBNAIL_WIDTH);
const PATTERN_URL = dataUrl(
	'image/svg+xml',
	Buffer.from(
		turnPatternSvg(
			THUMBNAIL_WIDTH,
			THUMBNAIL_HEIGHT,
			{ tone: PATTERN_TONE, heroBlock: PAPER, heroBall: PULSE_RED },
			{ solidUntil: HERO_CELL.y + HERO_CELL.size, goneFrom: PATTERN_GONE_FROM }
		)
	)
);
const LOGO_SCRIM_URL = dataUrl(
	'image/svg+xml',
	Buffer.from(logoScrimSvg(LOGO_SCRIM_WIDTH, LOGO_SCRIM_HEIGHT, INK, LOGO_SCRIM_OPACITY))
);

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
	const place = cleanText(venue ?? '');
	if (place) parts.push(place.toLocaleUpperCase('de-CH'));
	return parts.join(' · ');
}

function normalizeColor(color: string | null | undefined): string {
	return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : PULSE_RED;
}

const UNSUPPORTED_GLYPHS = /[\p{Extended_Pictographic}\u{FE0E}\u{FE0F}\u{200D}]/gu;

/** Drops emoji (the typeface is Latin only) and collapses whitespace. */
function cleanText(text: string): string {
	return text.replace(UNSUPPORTED_GLYPHS, '').trim().replace(/\s+/g, ' ');
}

function teamName(name: string): string {
	return cleanText(name).toLocaleUpperCase('de-CH');
}

function titleRow(home: string, guest: string, size: number, constrained: boolean, maxWidth: number): Element {
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
			...(constrained ? { width: maxWidth } : {})
		},
		[name(home), vs, name(guest)],
		{ 'data-title': true }
	);
}

function headlineRow(text: string, size: number, constrained: boolean, maxWidth: number): Element {
	return el(
		'div',
		{
			fontFamily: 'Inter',
			fontWeight: 800,
			fontSize: size,
			lineHeight: 1,
			color: PAPER,
			whiteSpace: 'nowrap',
			...(constrained
				? { width: maxWidth, overflow: 'hidden', textOverflow: 'ellipsis', paddingBottom: DESCENDER_ROOM, marginBottom: -DESCENDER_ROOM }
				: {})
		},
		text,
		{ 'data-title': true }
	);
}

type RowBuilder = (size: number, constrained: boolean) => Element;

async function measureTitle(row: RowBuilder, size: number): Promise<number> {
	let width = Infinity;
	await satori(el('div', {}, row(size, false)) as never, {
		width: 8000,
		height: size * 2,
		fonts: FONTS,
		onNodeDetected: (node: SatoriNode) => {
			if (node.props['data-title']) width = node.width;
		}
	});
	return width;
}

async function fitTitleSize(row: RowBuilder, maxWidth: number): Promise<{ size: number; constrained: boolean }> {
	for (let size = TITLE_MAX_SIZE; size >= TITLE_MIN_SIZE; size -= TITLE_STEP) {
		if ((await measureTitle(row, size)) <= maxWidth) return { size, constrained: false };
	}
	return { size: TITLE_MIN_SIZE, constrained: true };
}

function dateLine(input: ThumbnailInput): string {
	return formatMatchLine(input.scheduledAt, 'venue' in input ? input.venue : null);
}

/** Without a date line the title shares its band with the lockup and must stay left of it. */
function titleBuilder(input: ThumbnailInput): { row: RowBuilder; maxWidth: number } {
	const maxWidth = dateLine(input) ? CONTENT_WIDTH : TITLE_WIDTH_BESIDE_LOCKUP;
	if ('headline' in input) {
		const text = cleanText(input.headline);
		return { row: (size, constrained) => headlineRow(text, size, constrained, maxWidth), maxWidth };
	}
	const home = teamName(input.homeTeam);
	const guest = teamName(input.guestTeam);
	return { row: (size, constrained) => titleRow(home, guest, size, constrained, maxWidth), maxWidth };
}

function clubLogo(bytes: Uint8Array | null | undefined): Element[] {
	const url = embeddableImage(bytes);
	const dimensions = bytes ? readImageDimensions(bytes) : null;
	if (!url || !dimensions) return [];
	const scale = Math.min(LOGO_MAX_WIDTH / dimensions.width, LOGO_MAX_HEIGHT / dimensions.height);
	const width = Math.max(1, Math.round(dimensions.width * scale));
	const height = Math.max(1, Math.round(dimensions.height * scale));
	return [
		image(LOGO_SCRIM_URL, { position: 'absolute', left: 0, top: 0, width: LOGO_SCRIM_WIDTH, height: LOGO_SCRIM_HEIGHT }),
		image(url, { position: 'absolute', left: MARGIN_X, top: LOGO_TOP, width, height, objectFit: 'contain' })
	];
}

async function buildTree(input: ThumbnailInput): Promise<Element> {
	const photoUrl = embeddableImage(input.photo);
	const matchLine = dateLine(input);
	const { row, maxWidth } = titleBuilder(input);
	const fit = await fitTitleSize(row, maxWidth);
	const title = row(fit.size, fit.constrained);

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
	children.push(
		image(PATTERN_URL, { position: 'absolute', left: 0, top: 0, width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT }),
		...clubLogo(input.logo),
		el('div', {
			position: 'absolute',
			left: 0,
			bottom: 0,
			width: THUMBNAIL_WIDTH,
			height: BAR_HEIGHT,
			backgroundColor: normalizeColor(input.clubColor)
		}),
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
				'headline' in input ? ['headline', input.headline] : ['match', input.homeTeam, input.guestTeam, input.venue],
				input.scheduledAt?.getTime() ?? null,
				normalizeColor(input.clubColor),
				sha256(input.photo),
				sha256(input.logo)
			])
		)
		.digest('hex');
}

/** Font size in px the headline or team names get: 104 down to 56 in 4 px steps, whichever fits first. */
export async function titleFontSize(input: ThumbnailInput): Promise<number> {
	const { row, maxWidth } = titleBuilder(input);
	return (await fitTitleSize(row, maxWidth)).size;
}

/** 1280 x 720 JPEG of the Scorely stream thumbnail template. Team names, headline and venue are rendered as text only. */
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
