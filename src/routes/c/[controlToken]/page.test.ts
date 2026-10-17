import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const markup = readFileSync(fileURLToPath(new URL('./+page.svelte', import.meta.url)), 'utf8').split('<style>')[0];

describe('guest control page', () => {
	it('lets the guest scorer switch service per team', () => {
		expect(markup).toMatch(/onclick=\{[^}]*switchService\(\)/);
	});
});
