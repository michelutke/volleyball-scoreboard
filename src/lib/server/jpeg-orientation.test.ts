import { describe, it, expect } from 'vitest';
import jpeg from 'jpeg-js';
import { readJpegOrientation, uprightJpeg } from './jpeg-orientation';
import { isRed, markedJpeg, noisyJpeg, pixelAt, withExifOrientation, withSegment } from './thumbnail/test-images';

function size(bytes: Uint8Array) {
	const { width, height } = jpeg.decode(bytes, { useTArray: true });
	return { width, height };
}

describe('readJpegOrientation', () => {
	it('returns null without EXIF', () => {
		expect(readJpegOrientation(markedJpeg())).toBeNull();
	});

	it.each([1, 3, 6, 8])('reads orientation %i', (orientation) => {
		expect(readJpegOrientation(withExifOrientation(markedJpeg(), orientation))).toBe(orientation);
	});

	it('returns null for truncated data', () => {
		expect(readJpegOrientation(withExifOrientation(markedJpeg(), 6).subarray(0, 12))).toBeNull();
	});
});

describe('uprightJpeg', () => {
	it('keeps a JPEG without EXIF as is', () => {
		const bytes = markedJpeg();
		expect(uprightJpeg(bytes)).toBe(bytes);
	});

	it('strips EXIF, XMP, Photoshop data and comments without re-encoding when no rotation is needed', () => {
		const clean = markedJpeg();
		let bytes: Uint8Array<ArrayBuffer> = withExifOrientation(clean, 1);
		bytes = withSegment(bytes, 0xe1, Buffer.from('Exif\0\0GPS-SECRET-EXIF'));
		bytes = withSegment(bytes, 0xe1, Buffer.from('http://ns.adobe.com/xap/1.0/\0GPS-SECRET-XMP'));
		bytes = withSegment(bytes, 0xed, Buffer.from('Photoshop 3.0\0GPS-SECRET-PS'));
		bytes = withSegment(bytes, 0xfe, Buffer.from('GPS-SECRET-COMMENT'));
		const stripped = uprightJpeg(bytes);
		expect(Buffer.from(stripped).includes('GPS-SECRET')).toBe(false);
		expect(Buffer.from(stripped).includes('Exif')).toBe(false);
		expect(Buffer.from(stripped).equals(Buffer.from(clean))).toBe(true);
	});

	it('rotates orientation 6 upright: red block moves to the top right of a portrait image', () => {
		const upright = uprightJpeg(withExifOrientation(markedJpeg(), 6));
		expect(size(upright)).toEqual({ width: 32, height: 64 });
		expect(isRed(pixelAt(upright, 24, 8))).toBe(true);
		expect(isRed(pixelAt(upright, 8, 8))).toBe(false);
		expect(readJpegOrientation(upright)).toBeNull();
	});

	it('rotates orientation 3 by 180 degrees: red block moves to the bottom right', () => {
		const upright = uprightJpeg(withExifOrientation(markedJpeg(), 3));
		expect(size(upright)).toEqual({ width: 64, height: 32 });
		expect(isRed(pixelAt(upright, 56, 24))).toBe(true);
		expect(isRed(pixelAt(upright, 8, 8))).toBe(false);
		expect(readJpegOrientation(upright)).toBeNull();
	});

	it.each([
		[2, 64, 32, 56, 8],
		[4, 64, 32, 8, 24],
		[5, 32, 64, 8, 8],
		[7, 32, 64, 24, 56],
		[8, 32, 64, 8, 56]
	])('applies orientation %i', (orientation, width, height, x, y) => {
		const upright = uprightJpeg(withExifOrientation(markedJpeg(), orientation));
		expect(size(upright)).toEqual({ width, height });
		expect(isRed(pixelAt(upright, x, y))).toBe(true);
	});

	it('re-encodes at a lower quality when the upright JPEG would exceed the limit', () => {
		const source = withExifOrientation(noisyJpeg(20), 6);
		const unlimited = uprightJpeg(source);
		const limit = Math.round(unlimited.byteLength * 0.8);
		const limited = uprightJpeg(source, limit);
		expect(limited.byteLength).toBeLessThan(unlimited.byteLength);
		expect(size(limited)).toEqual({ width: 192, height: 192 });
	});

	it('returns garbage after a valid EXIF header unchanged', () => {
		const broken = withExifOrientation(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), 6);
		expect(Buffer.from(uprightJpeg(broken)).includes('Exif')).toBe(false);
	});
});
