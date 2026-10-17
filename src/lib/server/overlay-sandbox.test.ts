import { describe, it, expect } from 'vitest';
import { buildCssVars } from './overlay-sandbox.js';

describe('buildCssVars', () => {
	it('maps template colours to the overlay CSS variables', () => {
		expect(buildCssVars({ overlayBg: '#1a1a1a', scoreColor: 'rgb(1, 2, 3)' })).toBe(
			':root { --overlay-bg: #1a1a1a; --score-color: rgb(1, 2, 3); }'
		);
	});

	it('drops values that could end the style block', () => {
		expect(buildCssVars({ overlayBg: 'red;}</style><script>x()</script>' })).toBe(':root {  }');
	});
});
