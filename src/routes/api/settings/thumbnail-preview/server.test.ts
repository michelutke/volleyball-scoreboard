import { describe, it, expect, vi } from 'vitest';

const renderPreviewMock = vi.hoisted(() => vi.fn());
vi.mock('$lib/server/thumbnail/service', () => ({ renderPreviewThumbnail: renderPreviewMock }));

const { GET } = await import('./+server');

describe('GET /api/settings/thumbnail-preview', () => {
	it('renders the preview for the caller org as JPEG', async () => {
		const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
		renderPreviewMock.mockResolvedValue(jpeg);
		const res = await GET({ locals: { orgId: 'org-a' } } as unknown as Parameters<typeof GET>[0]);
		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toBe('image/jpeg');
		expect(new Uint8Array(await res.arrayBuffer())).toEqual(jpeg);
		expect(renderPreviewMock).toHaveBeenCalledWith('org-a');
	});
});
