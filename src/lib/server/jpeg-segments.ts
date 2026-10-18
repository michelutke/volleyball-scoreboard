export interface JpegSegment {
	marker: number;
	offset: number;
	end: number;
}

const STANDALONE_MARKERS = new Set([0x01, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7]);
const START_OF_SCAN = 0xda;

/** Marker segments of a JPEG up to and including the scan header. Entropy coded data after it is not visited. */
export function* jpegSegments(bytes: Uint8Array): Generator<JpegSegment> {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	let offset = 2;
	while (offset + 4 <= bytes.length && bytes[offset] === 0xff) {
		const marker = bytes[offset + 1];
		if (marker === 0xff) {
			offset++;
			continue;
		}
		if (STANDALONE_MARKERS.has(marker)) {
			offset += 2;
			continue;
		}
		if (marker === 0xd9) return;
		const length = view.getUint16(offset + 2);
		if (length < 2) return;
		const end = Math.min(offset + 2 + length, bytes.length);
		yield { marker, offset, end };
		if (marker === START_OF_SCAN) return;
		offset += 2 + length;
	}
}

const METADATA_MARKERS = new Set([0xe1, 0xed, 0xfe]);

/** Removes EXIF and XMP (APP1), Photoshop data (APP13) and comments without re-encoding. Returns the input when nothing is removed. */
export function stripJpegMetadata(bytes: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
	const parts: Uint8Array[] = [bytes.subarray(0, 2)];
	let kept = 2;
	let removed = false;
	for (const segment of jpegSegments(bytes)) {
		if (!METADATA_MARKERS.has(segment.marker)) continue;
		parts.push(bytes.subarray(kept, segment.offset));
		kept = segment.end;
		removed = true;
	}
	if (!removed) return bytes;
	parts.push(bytes.subarray(kept));
	return new Uint8Array(Buffer.concat(parts));
}
