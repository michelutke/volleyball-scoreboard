import { Resvg } from '@resvg/resvg-js';
import jpeg from 'jpeg-js';

export function pngBytes(color = '#1d4ed8', size = 64, height = size): Uint8Array<ArrayBuffer> {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${height}"><rect width="${size}" height="${height}" fill="${color}"/></svg>`;
	return new Uint8Array(new Resvg(svg).render().asPng());
}

export function jpegBytes(width = 320, height = 180): Uint8Array<ArrayBuffer> {
	const data = Buffer.alloc(width * height * 4);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = (y * width + x) * 4;
			data[i] = (x * 255) / width;
			data[i + 1] = (y * 255) / height;
			data[i + 2] = 120;
			data[i + 3] = 255;
		}
	}
	return new Uint8Array(jpeg.encode({ data, width, height }, 80).data);
}

export const WEBP_BYTES = new Uint8Array(Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64'));

export const SVG_BYTES = new TextEncoder().encode(
	'<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>'
);

/** 64 x 32 JPEG, blue with a red 16 x 16 block at the top left. */
export function markedJpeg(): Uint8Array<ArrayBuffer> {
	const width = 64;
	const height = 32;
	const data = Buffer.alloc(width * height * 4, 255);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = (y * width + x) * 4;
			const red = x < 16 && y < 16;
			data[i] = red ? 255 : 0;
			data[i + 1] = 0;
			data[i + 2] = red ? 0 : 255;
		}
	}
	return new Uint8Array(jpeg.encode({ data, width, height }, 95).data);
}

export function withExifOrientation(bytes: Uint8Array, orientation: number): Uint8Array<ArrayBuffer> {
	const tiff = Buffer.alloc(26);
	tiff.write('MM', 0, 'latin1');
	tiff.writeUInt16BE(42, 2);
	tiff.writeUInt32BE(8, 4);
	tiff.writeUInt16BE(1, 8);
	tiff.writeUInt16BE(0x0112, 10);
	tiff.writeUInt16BE(3, 12);
	tiff.writeUInt32BE(1, 14);
	tiff.writeUInt16BE(orientation, 18);
	const payload = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]);
	const header = Buffer.from([0xff, 0xe1, (payload.length + 2) >> 8, (payload.length + 2) & 0xff]);
	return new Uint8Array(Buffer.concat([bytes.subarray(0, 2), header, payload, bytes.subarray(2)]));
}

/** RGB of one pixel of a JPEG. */
export function pixelAt(bytes: Uint8Array, x: number, y: number): [number, number, number] {
	const { data, width } = jpeg.decode(bytes, { useTArray: true });
	const i = (y * width + x) * 4;
	return [data[i], data[i + 1], data[i + 2]];
}

export function isRed([r, , b]: [number, number, number]): boolean {
	return r > 200 && b < 60;
}

/** PNG signature plus an IHDR claiming the given size; small on disk, huge when decoded. */
export function pngHeader(width: number, height: number): Uint8Array<ArrayBuffer> {
	const bytes = Buffer.alloc(33);
	Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes, 0);
	bytes.writeUInt32BE(13, 8);
	bytes.write('IHDR', 12, 'latin1');
	bytes.writeUInt32BE(width, 16);
	bytes.writeUInt32BE(height, 20);
	bytes.set([8, 6, 0, 0, 0], 24);
	return new Uint8Array(bytes);
}

/** Patches the frame size in the SOF segment of a JPEG. */
export function withJpegDimensions(bytes: Uint8Array, width: number, height: number): Uint8Array<ArrayBuffer> {
	const out = new Uint8Array(bytes);
	for (let i = 2; i + 9 < out.length; i++) {
		if (out[i] === 0xff && (out[i + 1] === 0xc0 || out[i + 1] === 0xc2)) {
			out[i + 5] = height >> 8;
			out[i + 6] = height & 0xff;
			out[i + 7] = width >> 8;
			out[i + 8] = width & 0xff;
			return out;
		}
	}
	throw new Error('no SOF segment');
}

export function withSegment(bytes: Uint8Array, marker: number, payload: Buffer): Uint8Array<ArrayBuffer> {
	const header = Buffer.from([0xff, marker, (payload.length + 2) >> 8, (payload.length + 2) & 0xff]);
	return new Uint8Array(Buffer.concat([bytes.subarray(0, 2), header, payload, bytes.subarray(2)]));
}

/** Deterministic noise: compresses badly, so a higher quality re-encode is much larger than a low quality original. */
export function noisyJpeg(quality: number, size = 192): Uint8Array<ArrayBuffer> {
	const data = Buffer.alloc(size * size * 4, 255);
	let seed = 12345;
	for (let i = 0; i < size * size; i++) {
		seed = (seed * 1103515245 + 12345) & 0x7fffffff;
		data[i * 4] = seed & 0xff;
		data[i * 4 + 1] = (seed >> 8) & 0xff;
		data[i * 4 + 2] = (seed >> 16) & 0xff;
	}
	return new Uint8Array(jpeg.encode({ data, width: size, height: size }, quality).data);
}
