import { describe, it, expect, vi } from 'vitest';

const findFirst = vi.hoisted(() => vi.fn());
vi.mock('$lib/server/db/index.js', () => ({ db: { query: { designTemplates: { findFirst } } } }));

const { GET } = await import('./+server');

type GetEvent = Parameters<typeof GET>[0];

function call(templateId: string) {
	return GET({
		params: { templateId },
		url: new URL(`https://scorely.ch/api/overlay-sandbox/${templateId}`),
		locals: { orgId: 'org-a' }
	} as unknown as GetEvent);
}

describe('overlay sandbox', () => {
	it('serves custom code under a sandboxed CSP so it never runs on the app origin', async () => {
		findFirst.mockResolvedValue({ orgId: 'org-a', isPublic: false, customCode: '<div>bug</div>' });
		const res = await call('1');
		expect(res.status).toBe(200);
		expect(res.headers.get('content-security-policy')).toMatch(/^sandbox allow-scripts;/);
		expect(res.headers.get('content-security-policy')).toContain("connect-src 'none'");
	});

	it('hides private templates of other orgs', async () => {
		findFirst.mockResolvedValue({ orgId: 'org-b', isPublic: false, customCode: '<div></div>' });
		expect((await call('2')).status).toBe(404);
	});
});
