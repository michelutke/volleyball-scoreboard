export interface AccentPalette {
	accent: string;
	accentMid: string;
	accentDark: string;
	accentDeep: string;
	accentDeepest: string;
	accentBorder: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export const DEFAULT_ACCENT = '#38bdf8';

function hexToHsl(hex: string): [number, number, number] {
	const r = parseInt(hex.slice(1, 3), 16) / 255;
	const g = parseInt(hex.slice(3, 5), 16) / 255;
	const b = parseInt(hex.slice(5, 7), 16) / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	if (max === min) return [0, 0, l * 100];
	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
	let h = 0;
	if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
	else if (max === g) h = ((b - r) / d + 2) / 6;
	else h = ((r - g) / d + 4) / 6;
	return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
	s /= 100;
	l /= 100;
	const k = (n: number) => (n + h / 30) % 12;
	const a = s * Math.min(l, 1 - l);
	const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
	const toHex = (x: number) =>
		Math.round(x * 255)
			.toString(16)
			.padStart(2, '0');
	return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

export const ACCENT_CSS_PROPS: readonly (readonly [string, keyof AccentPalette])[] = [
	['--color-accent', 'accent'],
	['--color-accent-mid', 'accentMid'],
	['--color-accent-dark', 'accentDark'],
	['--color-accent-deep', 'accentDeep'],
	['--color-accent-deepest', 'accentDeepest'],
	['--color-accent-border', 'accentBorder']
];

export function generateAccentPalette(hex: string, mode: 'light' | 'dark' = 'dark'): AccentPalette {
	const [h, s] = hexToHsl(hex);
	if (mode === 'light') {
		return {
			accent: hslToHex(h, Math.min(s, 90), 40),
			accentMid: hslToHex(h, Math.min(s, 90), 56),
			accentDark: hslToHex(h, Math.min(s, 85), 45),
			accentDeep: hslToHex(h, Math.min(s, 80), 37),
			accentDeepest: hslToHex(h, Math.min(s, 70), 24),
			accentBorder: hslToHex(h, 30, 75)
		};
	}
	return {
		accent: hslToHex(h, Math.min(s, 90), 72),
		accentMid: hslToHex(h, Math.min(s, 90), 56),
		accentDark: hslToHex(h, Math.min(s, 85), 45),
		accentDeep: hslToHex(h, Math.min(s, 80), 37),
		accentDeepest: hslToHex(h, Math.min(s, 70), 24),
		accentBorder: hslToHex(h, 40, 24)
	};
}

export type MotionMode = 'full' | 'damped' | 'static' | 'system';

export const THEME_COOKIE = 'scoring-theme';
export const MOTION_COOKIE = 'scoring-motion';

function readCookie(name: string): string | null {
	if (typeof document === 'undefined') return null;
	const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
	return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string): void {
	if (typeof document === 'undefined') return;
	const oneYear = 60 * 60 * 24 * 365;
	const secure = location.protocol === 'https:' ? '; Secure' : '';
	document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${oneYear}; SameSite=Lax${secure}`;
}

export function getStoredTheme(): ThemeMode {
	const fromCookie = readCookie(THEME_COOKIE) as ThemeMode | null;
	if (fromCookie === 'light' || fromCookie === 'dark' || fromCookie === 'system') return fromCookie;
	if (typeof localStorage === 'undefined') return 'system';
	return (localStorage.getItem('theme') as ThemeMode) ?? 'system';
}

export function setStoredTheme(mode: ThemeMode): void {
	localStorage.setItem('theme', mode);
	writeCookie(THEME_COOKIE, mode);
	window.dispatchEvent(new CustomEvent('themechange', { detail: mode }));
}

export function getStoredMotion(): MotionMode {
	const fromCookie = readCookie(MOTION_COOKIE) as MotionMode | null;
	if (fromCookie === 'full' || fromCookie === 'damped' || fromCookie === 'static' || fromCookie === 'system') {
		return fromCookie;
	}
	return 'system';
}

export function setStoredMotion(mode: MotionMode): void {
	writeCookie(MOTION_COOKIE, mode);
	window.dispatchEvent(new CustomEvent('motionchange', { detail: mode }));
}

export function getEffectiveMotion(mode: MotionMode): 'full' | 'damped' | 'static' {
	if (mode === 'full' || mode === 'damped' || mode === 'static') return mode;
	if (typeof window === 'undefined') return 'full';
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'damped' : 'full';
}

export function getEffectiveTheme(mode: ThemeMode): 'light' | 'dark' {
	if (mode === 'light' || mode === 'dark') return mode;
	if (typeof window === 'undefined') return 'dark';
	return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}
