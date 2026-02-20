import { describe, it, expect } from 'vitest';
import { generateAccentPalette, DEFAULT_ACCENT } from './theme.js';

describe('generateAccentPalette', () => {
	it('returns 6 hex color strings', () => {
		const palette = generateAccentPalette(DEFAULT_ACCENT);
		const hexPattern = /^#[0-9a-f]{6}$/;
		expect(palette.accent).toMatch(hexPattern);
		expect(palette.accentMid).toMatch(hexPattern);
		expect(palette.accentDark).toMatch(hexPattern);
		expect(palette.accentDeep).toMatch(hexPattern);
		expect(palette.accentDeepest).toMatch(hexPattern);
		expect(palette.accentBorder).toMatch(hexPattern);
	});

	it('accent is lightest, accentDeepest is darkest', () => {
		const palette = generateAccentPalette('#e74c3c');
		// Extract lightness by parsing hex → relative luminance check
		const brightness = (hex: string) => {
			const r = parseInt(hex.slice(1, 3), 16);
			const g = parseInt(hex.slice(3, 5), 16);
			const b = parseInt(hex.slice(5, 7), 16);
			return r + g + b;
		};
		expect(brightness(palette.accent)).toBeGreaterThan(brightness(palette.accentMid));
		expect(brightness(palette.accentMid)).toBeGreaterThan(brightness(palette.accentDark));
		expect(brightness(palette.accentDark)).toBeGreaterThan(brightness(palette.accentDeepest));
	});

	it('produces different palettes for different inputs', () => {
		const blue = generateAccentPalette('#3498db');
		const red = generateAccentPalette('#e74c3c');
		expect(blue.accent).not.toBe(red.accent);
	});
});
