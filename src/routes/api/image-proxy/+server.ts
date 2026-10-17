import { LRUCache } from 'lru-cache';
import { env } from '$env/dynamic/private';
import {
	IMAGE_SECURITY_HEADERS,
	ImageProxyError,
	fetchImage,
	type FetchedImage
} from '$lib/server/image-proxy.js';
import type { RequestHandler } from './$types.js';

const cache = new LRUCache<string, FetchedImage>({
	maxSize: 50 * 1024 * 1024,
	sizeCalculation: (image) => Math.max(1, image.data.byteLength),
	ttl: 60 * 60 * 1000
});

function errorResponse(status: number): Response {
	return new Response(null, { status, headers: IMAGE_SECURITY_HEADERS });
}

function imageResponse({ data, contentType }: FetchedImage): Response {
	return new Response(data as BodyInit, {
		headers: {
			...IMAGE_SECURITY_HEADERS,
			'Content-Type': contentType,
			'Cache-Control': 'max-age=3600'
		}
	});
}

export const GET: RequestHandler = async ({ url }) => {
	const imageUrl = url.searchParams.get('url');
	if (!imageUrl) return errorResponse(400);

	const hit = cache.get(imageUrl);
	if (hit) return imageResponse(hit);

	try {
		const image = await fetchImage(imageUrl, { allowHttp: env.NODE_ENV === 'development' });
		cache.set(imageUrl, image);
		return imageResponse(image);
	} catch (error) {
		if (error instanceof ImageProxyError) return errorResponse(error.status);
		return errorResponse(502);
	}
};
