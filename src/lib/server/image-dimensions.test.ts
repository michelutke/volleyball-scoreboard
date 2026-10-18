import { describe, it, expect } from 'vitest';
import { isDecodableSize, readImageDimensions } from './image-dimensions';
import { jpegBytes, pngBytes, pngHeader, withExifOrientation, withJpegDimensions } from './thumbnail/test-images';

describe('readImageDimensions', () => {
	it('reads PNG dimensions from the header', () => {
		expect(readImageDimensions(pngBytes('#000000', 40))).toEqual({ width: 40, height: 40 });
		expect(readImageDimensions(pngHeader(12000, 7))).toEqual({ width: 12000, height: 7 });
	});

	it('reads JPEG dimensions from the frame header, also behind EXIF', () => {
		expect(readImageDimensions(jpegBytes(320, 180))).toEqual({ width: 320, height: 180 });
		expect(readImageDimensions(withExifOrientation(jpegBytes(320, 180), 6))).toEqual({ width: 320, height: 180 });
	});

	it.each([
		['empty', new Uint8Array()],
		['JPEG without frame header', new Uint8Array([0xff, 0xd8, 0xff, 0xd9])],
		['truncated PNG', pngHeader(10, 10).subarray(0, 20)],
		['PNG without IHDR', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x58, 0x58, 0x58, 0x58, 0, 0, 0, 1, 0, 0, 0, 1])],
		['zero size', pngHeader(0, 10)]
	])('returns null for %s', (_name, bytes) => {
		expect(readImageDimensions(bytes)).toBeNull();
	});

	it('reads a patched JPEG frame size', () => {
		expect(readImageDimensions(withJpegDimensions(jpegBytes(), 6001, 100))).toEqual({ width: 6001, height: 100 });
	});
});

describe('isDecodableSize', () => {
	it.each([
		[6000, 4000, true],
		[4000, 6000, true],
		[6001, 100, false],
		[100, 6001, false],
		[5000, 5000, false],
		[12000, 12000, false]
	])('%i x %i is %s', (width, height, expected) => {
		expect(isDecodableSize({ width, height })).toBe(expected);
	});

	it('rejects unreadable sizes', () => {
		expect(isDecodableSize(null)).toBe(false);
	});
});
