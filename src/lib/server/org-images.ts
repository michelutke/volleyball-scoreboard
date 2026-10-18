import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { orgImages } from '$lib/server/db/schema.js';
import { MAX_IMAGE_BYTES, sniffImageType } from '$lib/server/image-proxy';
import { isDecodableSize, readImageDimensions } from '$lib/server/image-dimensions';
import { uprightJpeg } from '$lib/server/jpeg-orientation';

export const IMAGE_KINDS = ['thumbnail_photo', 'club_logo'] as const;
export type ImageKind = (typeof IMAGE_KINDS)[number];

export const UPLOAD_IMAGE_TYPES = ['image/jpeg', 'image/png'] as const;
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;
const TOO_LARGE = 'Bild ist zu gross (max. 5 MB).';

export interface ImageUpload {
	data: Uint8Array<ArrayBuffer>;
	contentType: (typeof UPLOAD_IMAGE_TYPES)[number];
}

export class ImageUploadError extends Error {
	constructor(
		public readonly status: 400 | 413,
		message: string
	) {
		super(message);
		this.name = 'ImageUploadError';
	}
}

export function parseImageKind(raw: string | undefined): ImageKind | null {
	return (IMAGE_KINDS as readonly string[]).includes(raw ?? '') ? (raw as ImageKind) : null;
}

async function readLimited(request: Request, limit: number): Promise<Uint8Array<ArrayBuffer>> {
	const declared = Number(request.headers.get('content-length'));
	if (Number.isFinite(declared) && declared > limit) {
		throw new ImageUploadError(413, TOO_LARGE);
	}
	if (!request.body) return new Uint8Array(0);
	const chunks: Uint8Array[] = [];
	let total = 0;
	const reader = request.body.getReader();
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		total += value.byteLength;
		if (total > limit) {
			await reader.cancel();
			throw new ImageUploadError(413, TOO_LARGE);
		}
		chunks.push(value);
	}
	return new Uint8Array(Buffer.concat(chunks));
}

async function extractBytes(request: Request, maxBytes: number): Promise<Uint8Array<ArrayBuffer>> {
	const contentType = request.headers.get('content-type') ?? '';
	if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
		return readLimited(request, maxBytes);
	}
	const body = await readLimited(request, maxBytes + MULTIPART_OVERHEAD_BYTES);
	let file: FormDataEntryValue | null;
	try {
		file = (await new Response(body, { headers: { 'content-type': contentType } }).formData()).get('file');
	} catch {
		throw new ImageUploadError(400, 'Ungültiger Upload.');
	}
	if (!(file instanceof File)) throw new ImageUploadError(400, 'Feld "file" fehlt.');
	if (file.size > maxBytes) throw new ImageUploadError(413, TOO_LARGE);
	return new Uint8Array(await file.arrayBuffer());
}

/**
 * Reads an image from a raw or multipart body. The type comes from the magic bytes, never from the client; the pixel size
 * is checked from the header before anything is decoded. JPEGs come back upright and without metadata.
 */
export async function readImageUpload(request: Request, maxBytes = MAX_IMAGE_BYTES): Promise<ImageUpload> {
	const data = await extractBytes(request, maxBytes);
	if (data.byteLength === 0) throw new ImageUploadError(400, 'Kein Bild übermittelt.');
	const contentType = sniffImageType(data);
	if (contentType !== 'image/jpeg' && contentType !== 'image/png') {
		throw new ImageUploadError(400, 'Nur JPEG oder PNG erlaubt.');
	}
	const dimensions = readImageDimensions(data);
	if (!dimensions) throw new ImageUploadError(400, 'Bildgrösse nicht lesbar.');
	if (!isDecodableSize(dimensions)) throw new ImageUploadError(400, 'Bild hat zu viele Pixel (max. 24 MP).');
	if (contentType === 'image/png') return { data, contentType };
	const upright = uprightJpeg(data, maxBytes);
	if (upright.byteLength > maxBytes) throw new ImageUploadError(413, TOO_LARGE);
	return { data: upright, contentType };
}

export async function saveOrgImage(orgId: string, kind: ImageKind, upload: ImageUpload): Promise<Date> {
	const updatedAt = new Date();
	const values = { orgId, kind, contentType: upload.contentType, data: upload.data, updatedAt };
	await db
		.insert(orgImages)
		.values(values)
		.onConflictDoUpdate({
			target: [orgImages.orgId, orgImages.kind],
			set: { contentType: values.contentType, data: values.data, updatedAt }
		});
	return updatedAt;
}

export async function deleteOrgImage(orgId: string, kind: ImageKind): Promise<void> {
	await db.delete(orgImages).where(and(eq(orgImages.orgId, orgId), eq(orgImages.kind, kind)));
}

export async function getOrgImage(orgId: string, kind: ImageKind): Promise<ImageUpload | null> {
	const row = await db.query.orgImages.findFirst({
		where: and(eq(orgImages.orgId, orgId), eq(orgImages.kind, kind))
	});
	return row ? { data: row.data, contentType: row.contentType as ImageUpload['contentType'] } : null;
}

export async function getOrgImageKinds(orgId: string): Promise<Record<ImageKind, boolean>> {
	const rows = await db.select({ kind: orgImages.kind }).from(orgImages).where(eq(orgImages.orgId, orgId));
	const present = new Set<string>(rows.map((row) => row.kind));
	return { thumbnail_photo: present.has('thumbnail_photo'), club_logo: present.has('club_logo') };
}
