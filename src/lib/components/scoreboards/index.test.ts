import { describe, it, expect } from 'vitest';
import { getLayout, DEFAULT_LAYOUT_ID } from './index.js';

describe('getLayout', () => {
	it('falls back to the Kinetic score bug when no layout is set', () => {
		expect(DEFAULT_LAYOUT_ID).toBe('kinetic');
		expect(getLayout(null).id).toBe('kinetic');
		expect(getLayout('unknown').id).toBe('kinetic');
	});

	it('keeps an explicitly chosen Classic club layout', () => {
		expect(getLayout('classic').id).toBe('classic');
	});

	it('offers the pause layouts as additional choices', () => {
		expect(getLayout('drawer').id).toBe('drawer');
		expect(getLayout('colon').id).toBe('colon');
	});
});
