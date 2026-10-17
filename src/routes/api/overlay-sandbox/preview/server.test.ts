import { describe, it, expect } from 'vitest';
import { POST } from './+server';
import { MAX_CUSTOM_CODE_BYTES } from '$lib/server/overlay-sandbox.js';

type PostEvent = Parameters<typeof POST>[0];

function post(fields: Record<string, string>) {
	const body = new URLSearchParams(fields);
	const request = new Request('https://scorely.ch/api/overlay-sandbox/preview', { method: 'POST', body });
	return POST({ request } as unknown as PostEvent);
}

describe('overlay sandbox preview POST', () => {
	it('renders unsaved code with mock state under the sandbox CSP', async () => {
		const res = await post({ code: '<script>window.ok=1</script>', overlayBg: '#112233' });
		const html = await res.text();
		expect(res.status).toBe(200);
		expect(res.headers.get('content-security-policy')).toMatch(/^sandbox allow-scripts;/);
		expect(html).toContain('<script>window.ok=1</script>');
		expect(html).toContain('--overlay-bg: #112233;');
		expect(html).toContain('"type":"matchState"');
	});

	it('rejects missing and oversized code', async () => {
		expect((await post({})).status).toBe(400);
		expect((await post({ code: 'x'.repeat(MAX_CUSTOM_CODE_BYTES + 1) })).status).toBe(413);
	});
});
