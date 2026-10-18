import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import jpeg from 'jpeg-js';
import {
	SVG_BYTES,
	WEBP_BYTES,
	jpegBytes,
	markedJpeg,
	pngBytes,
	pngHeader,
	withExifOrientation,
	withJpegDimensions,
	withSegment
} from '$lib/server/thumbnail/test-images';

const findFirstMock = vi.hoisted(() => vi.fn());
const onConflictDoUpdateMock = vi.hoisted(() => vi.fn());
const insertValuesMock = vi.hoisted(() => vi.fn());
const deleteWhereMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db/index.js', () => ({
	db: {
		query: { orgImages: { findFirst: findFirstMock } },
		insert: () => ({ values: insertValuesMock }),
		delete: () => ({ where: deleteWhereMock })
	}
}));

const { GET, PUT, DELETE } = await import('./+server');

const MAX = 5 * 1024 * 1024;

function locals(isAdmin: boolean) {
	return { orgId: 'org-a', isAdmin };
}

function put(kind: string, body: BodyInit | null, init: { isAdmin?: boolean; headers?: Record<string, string> } = {}) {
	return PUT({
		params: { kind },
		request: new Request(`https://scorely.ch/api/settings/images/${kind}`, {
			method: 'PUT',
			body,
			headers: init.headers
		}),
		locals: locals(init.isAdmin ?? true)
	} as unknown as Parameters<typeof PUT>[0]);
}

function whereParams(where: unknown): unknown[] {
	return new PgDialect().sqlToQuery(where as never).params;
}

describe('PUT /api/settings/images/[kind]', () => {
	beforeEach(() => {
		findFirstMock.mockReset();
		onConflictDoUpdateMock.mockReset().mockResolvedValue(undefined);
		insertValuesMock.mockReset().mockReturnValue({ onConflictDoUpdate: onConflictDoUpdateMock });
		deleteWhereMock.mockReset().mockResolvedValue(undefined);
	});

	it('rejects non-admins', async () => {
		const res = await put('club_logo', pngBytes(), { isAdmin: false });
		expect(res.status).toBe(403);
		expect(insertValuesMock).not.toHaveBeenCalled();
	});

	it('rejects unknown kinds', async () => {
		const res = await put('avatar', pngBytes());
		expect(res.status).toBe(400);
		expect(insertValuesMock).not.toHaveBeenCalled();
	});

	it('stores a PNG for the caller org and answers with kind and updatedAt', async () => {
		const png = pngBytes();
		const res = await put('club_logo', png, { headers: { 'content-type': 'image/png' } });
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.kind).toBe('club_logo');
		expect(new Date(body.updatedAt).getTime()).not.toBeNaN();
		expect(insertValuesMock).toHaveBeenCalledWith(
			expect.objectContaining({ orgId: 'org-a', kind: 'club_logo', contentType: 'image/png', data: png })
		);
	});

	it('takes the content type from the magic bytes, not from the client', async () => {
		const res = await put('thumbnail_photo', jpegBytes(), { headers: { 'content-type': 'image/png' } });
		expect(res.status).toBe(200);
		expect(insertValuesMock).toHaveBeenCalledWith(expect.objectContaining({ contentType: 'image/jpeg' }));
	});

	it.each([
		[6, 32, 64],
		[3, 64, 32]
	])('stores a JPEG with EXIF orientation %i upright and without EXIF', async (orientation, width, height) => {
		const res = await put('thumbnail_photo', withExifOrientation(markedJpeg(), orientation));
		expect(res.status).toBe(200);
		const stored: Uint8Array = insertValuesMock.mock.calls[0][0].data;
		const decoded = jpeg.decode(stored, { useTArray: true });
		expect([decoded.width, decoded.height]).toEqual([width, height]);
		expect(Buffer.from(stored).includes(Buffer.from('Exif'))).toBe(false);
	});

	it('strips EXIF with GPS data from an upright JPEG before storing', async () => {
		const withGps = withSegment(markedJpeg(), 0xe1, Buffer.from('Exif\0\0GPS-SECRET'));
		expect((await put('thumbnail_photo', withGps)).status).toBe(200);
		const stored: Uint8Array = insertValuesMock.mock.calls[0][0].data;
		expect(Buffer.from(stored).includes('GPS-SECRET')).toBe(false);
	});

	it.each([
		['PNG 12000 x 12000', pngHeader(12000, 12000)],
		['PNG 6001 x 10', pngHeader(6001, 10)],
		['PNG 5000 x 5000', pngHeader(5000, 5000)],
		['JPEG 6001 x 100', withJpegDimensions(markedJpeg(), 6001, 100)],
		['JPEG 5000 x 5000 with EXIF 6', withExifOrientation(withJpegDimensions(markedJpeg(), 5000, 5000), 6)]
	])('rejects %s with 400 before decoding', async (_name, bytes) => {
		const res = await put('club_logo', bytes);
		expect(res.status).toBe(400);
		expect((await res.json()).error).toContain('24 MP');
		expect(insertValuesMock).not.toHaveBeenCalled();
	});

	it('rejects a JPEG with unreadable dimensions with 400', async () => {
		const res = await put('club_logo', new Uint8Array([0xff, 0xd8, 0xff, 0xd9]));
		expect(res.status).toBe(400);
		expect(insertValuesMock).not.toHaveBeenCalled();
	});

	it('upserts on the org and kind key', async () => {
		await put('thumbnail_photo', jpegBytes());
		expect(onConflictDoUpdateMock).toHaveBeenCalledWith(
			expect.objectContaining({ set: expect.objectContaining({ contentType: 'image/jpeg' }) })
		);
	});

	it('accepts a multipart upload in the field file', async () => {
		const form = new FormData();
		form.set('file', new File([pngBytes()], 'logo.png', { type: 'text/plain' }));
		const res = await put('club_logo', form);
		expect(res.status).toBe(200);
		expect(insertValuesMock).toHaveBeenCalledWith(expect.objectContaining({ contentType: 'image/png' }));
	});

	it('rejects a multipart upload without the field file', async () => {
		const form = new FormData();
		form.set('other', 'x');
		expect((await put('club_logo', form)).status).toBe(400);
		expect(insertValuesMock).not.toHaveBeenCalled();
	});

	it.each([
		['svg', SVG_BYTES],
		['webp', WEBP_BYTES],
		['gif', new TextEncoder().encode('GIF89a......')],
		['text', new TextEncoder().encode('hello')]
	])('rejects %s content with 400', async (_name, bytes) => {
		const res = await put('club_logo', bytes as BodyInit, { headers: { 'content-type': 'image/png' } });
		expect(res.status).toBe(400);
		expect(insertValuesMock).not.toHaveBeenCalled();
	});

	it('rejects an empty body with 400', async () => {
		expect((await put('club_logo', null)).status).toBe(400);
	});

	it('rejects a declared size over 5 MB with 413 before reading', async () => {
		const res = await put('club_logo', pngBytes(), { headers: { 'content-length': String(MAX + 1) } });
		expect(res.status).toBe(413);
		expect(insertValuesMock).not.toHaveBeenCalled();
	});

	it('rejects a streamed body over 5 MB with 413', async () => {
		const big = new Uint8Array(MAX + 1);
		big.set(pngBytes());
		const res = await put('club_logo', big);
		expect(res.status).toBe(413);
		expect(insertValuesMock).not.toHaveBeenCalled();
	});

	it('accepts a body of exactly 5 MB', async () => {
		const exact = new Uint8Array(MAX);
		exact.set(pngBytes());
		expect((await put('club_logo', exact)).status).toBe(200);
	});
});

describe('DELETE /api/settings/images/[kind]', () => {
	beforeEach(() => deleteWhereMock.mockReset().mockResolvedValue(undefined));

	function del(kind: string, isAdmin = true) {
		return DELETE({
			params: { kind },
			locals: locals(isAdmin)
		} as unknown as Parameters<typeof DELETE>[0]);
	}

	it('rejects non-admins', async () => {
		expect((await del('club_logo', false)).status).toBe(403);
		expect(deleteWhereMock).not.toHaveBeenCalled();
	});

	it('rejects unknown kinds', async () => {
		expect((await del('avatar')).status).toBe(400);
		expect(deleteWhereMock).not.toHaveBeenCalled();
	});

	it('removes the image of the caller org only', async () => {
		const res = await del('thumbnail_photo');
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true });
		const params = whereParams(deleteWhereMock.mock.calls[0][0]);
		expect(params).toEqual(['org-a', 'thumbnail_photo']);
	});
});

describe('GET /api/settings/images/[kind]', () => {
	beforeEach(() => findFirstMock.mockReset());

	function get(kind: string) {
		return GET({
			params: { kind },
			locals: locals(false)
		} as unknown as Parameters<typeof GET>[0]);
	}

	it('rejects unknown kinds', async () => {
		expect((await get('avatar')).status).toBe(400);
	});

	it('returns 404 when the org has no image', async () => {
		findFirstMock.mockResolvedValue(undefined);
		expect((await get('club_logo')).status).toBe(404);
	});

	it('returns the bytes with the stored content type for any org member, scoped to the org', async () => {
		const png = pngBytes();
		findFirstMock.mockResolvedValue({ contentType: 'image/png', data: png });
		const res = await get('club_logo');
		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toBe('image/png');
		expect(res.headers.get('cache-control')).toBe('no-store');
		expect(res.headers.get('content-security-policy')).toContain("default-src 'none'");
		expect(new Uint8Array(await res.arrayBuffer())).toEqual(png);
		expect(whereParams(findFirstMock.mock.calls[0][0].where)).toEqual(['org-a', 'club_logo']);
	});
});
