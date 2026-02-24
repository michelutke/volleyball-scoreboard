export interface AccentPalette {
	accent: string;
	accentMid: string;
	accentDark: string;
	accentDeep: string;
	accentDeepest: string;
	accentBorder: string;
}

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

export function generateAccentPalette(hex: string): AccentPalette {
	const [h, s] = hexToHsl(hex);
	return {
		accent: hslToHex(h, Math.min(s, 90), 72),
		accentMid: hslToHex(h, Math.min(s, 90), 56),
		accentDark: hslToHex(h, Math.min(s, 85), 45),
		accentDeep: hslToHex(h, Math.min(s, 80), 37),
		accentDeepest: hslToHex(h, Math.min(s, 70), 24),
		accentBorder: hslToHex(h, 40, 24)
	};
}
