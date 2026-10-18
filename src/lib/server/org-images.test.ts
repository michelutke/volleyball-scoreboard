import { describe, it, expect, vi } from 'vitest';

vi.mock('$lib/server/db/index.js', () => ({ db: {} }));

const { ImageUploadError, readImageUpload } = await import('./org-images');
const { uprightJpeg } = await import('./jpeg-orientation');
const { noisyJpeg, withExifOrientation } = await import('./thumbnail/test-images');

function request(body: Uint8Array<ArrayBuffer>) {
	return new Request('https://scorely.ch/upload', { method: 'PUT', body });
}

describe('readImageUpload size limit after the upright re-encode', () => {
	it('rejects a rotated JPEG whose re-encode exceeds the limit even at the lower quality with 413', async () => {
		const source = withExifOrientation(noisyJpeg(20), 6);
		const limit = Math.round(source.byteLength * 1.5);
		expect(uprightJpeg(source, limit).byteLength).toBeGreaterThan(limit);
		await expect(readImageUpload(request(source), limit)).rejects.toMatchObject({ status: 413 });
		await expect(readImageUpload(request(source), limit)).rejects.toBeInstanceOf(ImageUploadError);
	});

	it('accepts the same JPEG with a generous limit', async () => {
		const source = withExifOrientation(noisyJpeg(20), 6);
		const upload = await readImageUpload(request(source));
		expect(upload.contentType).toBe('image/jpeg');
	});
});
