import { LRUCache } from 'lru-cache';
import type { RequestHandler } from './$types.js';

const cache = new LRUCache<string, { data: ArrayBuffer; contentType: string }>({
	max: 200,
	ttl: 60 * 60 * 1000
});

const ALLOWED_HOSTS = [
	'api.volleyball.ch',
	'www.volleyball.ch',
	'volleyball.ch'
];

function isAllowedUrl(raw: string): boolean {
	try {
		const parsed = new URL(raw);
		if (parsed.protocol !== 'https:') return false;
		return ALLOWED_HOSTS.includes(parsed.hostname);
	} catch {
		return false;
	}
}

export const GET: RequestHandler = async ({ url }) => {
	const imageUrl = url.searchParams.get('url');
	if (!imageUrl) return new Response(null, { status: 400 });

	if (!isAllowedUrl(imageUrl)) {
		return new Response('Forbidden: URL not in allowlist', { status: 403 });
	}

	const hit = cache.get(imageUrl);
	if (hit) {
		return new Response(hit.data, {
			headers: { 'Content-Type': hit.contentType, 'Cache-Control': 'max-age=3600' }
		});
	}

	const res = await fetch(imageUrl);
	if (!res.ok) return new Response(null, { status: 502 });

	const contentType = res.headers.get('content-type') ?? 'image/png';
	if (!contentType.startsWith('image/')) {
		return new Response('Forbidden: not an image', { status: 403 });
	}

	const data = await res.arrayBuffer();
	cache.set(imageUrl, { data, contentType });

	return new Response(data, {
		headers: { 'Content-Type': contentType, 'Cache-Control': 'max-age=3600' }
	});
};
