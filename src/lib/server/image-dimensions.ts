import { jpegSegments } from './jpeg-segments';

export const MAX_IMAGE_SIDE = 6000;
export const MAX_IMAGE_PIXELS = 24_000_000;

export interface ImageDimensions {
	width: number;
	height: number;
}

const PNG_SIGNATURE_LENGTH = 8;
const IHDR = 0x49484452;
const SOF_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

function readPngDimensions(bytes: Uint8Array): ImageDimensions | null {
	if (bytes.length < 24) return null;
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	if (view.getUint32(PNG_SIGNATURE_LENGTH + 4) !== IHDR) return null;
	return { width: view.getUint32(16), height: view.getUint32(20) };
}

function readJpegDimensions(bytes: Uint8Array): ImageDimensions | null {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	for (const segment of jpegSegments(bytes)) {
		if (!SOF_MARKERS.has(segment.marker)) continue;
		if (segment.offset + 9 > bytes.length) return null;
		return { height: view.getUint16(segment.offset + 5), width: view.getUint16(segment.offset + 7) };
	}
	return null;
}

/** Pixel size read from the header of a PNG or JPEG without decoding it, or null when unreadable. */
export function readImageDimensions(bytes: Uint8Array): ImageDimensions | null {
	const dimensions = bytes[0] === 0x89 ? readPngDimensions(bytes) : readJpegDimensions(bytes);
	return dimensions && dimensions.width > 0 && dimensions.height > 0 ? dimensions : null;
}

export function isDecodableSize(dimensions: ImageDimensions | null): dimensions is ImageDimensions {
	return (
		dimensions !== null &&
		dimensions.width <= MAX_IMAGE_SIDE &&
		dimensions.height <= MAX_IMAGE_SIDE &&
		dimensions.width * dimensions.height <= MAX_IMAGE_PIXELS
	);
}
