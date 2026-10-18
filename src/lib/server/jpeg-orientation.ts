import jpeg from 'jpeg-js';
import { MAX_IMAGE_PIXELS } from './image-dimensions';
import { jpegSegments, stripJpegMetadata } from './jpeg-segments';

const UPRIGHT_QUALITY = 90;
const FALLBACK_QUALITY = 75;
const MAX_DECODE_MEMORY_MB = 256;

/** EXIF orientation (1 to 8) of a JPEG, or null when absent or unreadable. */
export function readJpegOrientation(bytes: Uint8Array): number | null {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	for (const { marker, offset, end } of jpegSegments(bytes)) {
		const start = offset + 4;
		if (marker === 0xe1 && start + 6 <= bytes.length && view.getUint32(start) === 0x45786966) {
			return readTiffOrientation(view, start + 6, end);
		}
	}
	return null;
}

function readTiffOrientation(view: DataView, tiff: number, end: number): number | null {
	if (tiff + 8 > end) return null;
	const little = view.getUint16(tiff) === 0x4949;
	const entries = tiff + view.getUint32(tiff + 4, little);
	if (entries + 2 > end) return null;
	const count = view.getUint16(entries, little);
	for (let i = 0; i < count; i++) {
		const entry = entries + 2 + i * 12;
		if (entry + 12 > end) return null;
		if (view.getUint16(entry, little) === 0x0112) {
			const value = view.getUint16(entry + 8, little);
			return value >= 1 && value <= 8 ? value : null;
		}
	}
	return null;
}

type Pixels = { data: Uint8Array; width: number; height: number };

function transform(src: Pixels, orientation: number): Pixels {
	const { width: w, height: h } = src;
	const swap = orientation >= 5;
	const outW = swap ? h : w;
	const outH = swap ? w : h;
	const out = new Uint8Array(outW * outH * 4);
	for (let y = 0; y < outH; y++) {
		for (let x = 0; x < outW; x++) {
			const [sx, sy] = sourceOf(orientation, x, y, w, h);
			out.set(src.data.subarray((sy * w + sx) * 4, (sy * w + sx) * 4 + 4), (y * outW + x) * 4);
		}
	}
	return { data: out, width: outW, height: outH };
}

function sourceOf(orientation: number, x: number, y: number, w: number, h: number): [number, number] {
	switch (orientation) {
		case 2:
			return [w - 1 - x, y];
		case 3:
			return [w - 1 - x, h - 1 - y];
		case 4:
			return [x, h - 1 - y];
		case 5:
			return [y, x];
		case 6:
			return [y, h - 1 - x];
		case 7:
			return [w - 1 - y, h - 1 - x];
		default:
			return [w - 1 - y, x];
	}
}

/**
 * Returns the JPEG without EXIF, XMP and comments. A rotation of 2 to 8 is applied to the pixels (decode, transform,
 * re-encode at quality 90, or 75 when that exceeds `maxBytes`); otherwise only the metadata segments are cut out.
 * Callers must have checked the pixel dimensions first.
 */
export function uprightJpeg(bytes: Uint8Array<ArrayBuffer>, maxBytes = Infinity): Uint8Array<ArrayBuffer> {
	const orientation = readJpegOrientation(bytes);
	if (!orientation || orientation === 1) return stripJpegMetadata(bytes);
	try {
		const decoded = jpeg.decode(bytes, {
			useTArray: true,
			formatAsRGBA: true,
			maxResolutionInMP: MAX_IMAGE_PIXELS / 1_000_000,
			maxMemoryUsageInMB: MAX_DECODE_MEMORY_MB
		});
		const upright = transform(decoded, orientation);
		const encoded = new Uint8Array(jpeg.encode(upright, UPRIGHT_QUALITY).data);
		if (encoded.byteLength <= maxBytes) return encoded;
		return new Uint8Array(jpeg.encode(upright, FALLBACK_QUALITY).data);
	} catch {
		return stripJpegMetadata(bytes);
	}
}
