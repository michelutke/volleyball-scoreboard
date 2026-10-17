import { describe, it, expect, vi, beforeEach } from 'vitest';

const findTemplate = vi.hoisted(() => vi.fn());
const findMatch = vi.hoisted(() => vi.fn());
vi.mock('$lib/server/db/index.js', () => ({
	db: { query: { designTemplates: { findFirst: findTemplate }, matches: { findFirst: findMatch } } }
}));

const { GET } = await import('./+server');

type GetEvent = Parameters<typeof GET>[0];

const CODE = '<div id="bug"></div><script>window.addEventListener("message", () => {})</script>';

function call(query = '', orgId: string | null = null) {
	return GET({
		params: { templateId: '7' },
		url: new URL(`https://scorely.ch/api/overlay-sandbox/7${query}`),
		locals: { auth: async () => (orgId ? { user: { orgId } } : null) }
	} as unknown as GetEvent);
}

describe('overlay sandbox GET', () => {
	beforeEach(() => {
		findTemplate.mockReset();
		findMatch.mockReset();
		findTemplate.mockResolvedValue({ id: 7, orgId: 'org-a', isPublic: false, customCode: CODE });
	});

	it('keeps the custom overlay scripts and serves them under a sandboxed CSP', async () => {
		const res = await call('', 'org-a');
		expect(res.status).toBe(200);
		expect(await res.text()).toContain(CODE);
		expect(res.headers.get('content-security-policy')).toMatch(/^sandbox allow-scripts;/);
		expect(res.headers.get('content-security-policy')).toContain("connect-src 'none'");
	});

	it('lets the owning org open its private template (session resolved in the route)', async () => {
		expect((await call('', 'org-a')).status).toBe(200);
	});

	it('hides a private template from other orgs and anonymous visitors', async () => {
		expect((await call('', 'org-b')).status).toBe(404);
		expect((await call('')).status).toBe(404);
	});

	it('serves a private template to the public overlay of a match that uses it', async () => {
		findMatch.mockResolvedValue({ id: 3, orgId: 'org-a', designTemplateId: 7 });
		expect((await call('?match=3')).status).toBe(200);
	});

	it('rejects a match that does not use the template', async () => {
		findMatch.mockResolvedValue({ id: 4, orgId: 'org-a', designTemplateId: 9 });
		expect((await call('?match=4')).status).toBe(404);
	});

	it('injects mock match state only in preview mode', async () => {
		findTemplate.mockResolvedValue({ id: 7, orgId: 'org-a', isPublic: true, customCode: CODE });
		expect(await (await call('?preview=1')).text()).toContain('"type":"matchState"');
		expect(await (await call('')).text()).not.toContain('"type":"matchState"');
	});
});
