import { LRUCache } from 'lru-cache';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types.js';

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const BLOCKED_HOSTNAMES = new Set([
	'localhost',
	'keycloak',
	'postgres',
	'db',
	'redis',
	'metadata.google.internal'
]);

function isPrivateIP(hostname: string): boolean {
	// IPv6 loopback / link-local
	if (hostname === '::1' || hostname.startsWith('fe80:')) return true;
	// IPv4 patterns
	const parts = hostname.split('.').map(Number);
	if (parts.length !== 4 || parts.some(isNaN)) return false;
	const [a, b] = parts;
	return (
		a === 127 ||
		a === 10 ||
		a === 0 ||
		(a === 172 && b >= 16 && b <= 31) ||
		(a === 192 && b === 168) ||
		(a === 169 && b === 254)
	);
}

function isAllowedImageUrl(urlString: string): boolean {
	let parsed: URL;
	try {
		parsed = new URL(urlString);
	} catch {
		return false;
	}
	const allowHttp = env.NODE_ENV === 'development';
	if (parsed.protocol !== 'https:' && !(allowHttp && parsed.protocol === 'http:')) return false;
	const hostname = parsed.hostname.toLowerCase();
	if (BLOCKED_HOSTNAMES.has(hostname)) return false;
	if (isPrivateIP(hostname)) return false;
	return true;
}

const cache = new LRUCache<string, { data: ArrayBuffer; contentType: string }>({
	max: 200,
	ttl: 60 * 60 * 1000
});

export const GET: RequestHandler = async ({ url }) => {
	const imageUrl = url.searchParams.get('url');
	if (!imageUrl) return new Response(null, { status: 400 });
	if (!isAllowedImageUrl(imageUrl)) return new Response(null, { status: 403 });

	const hit = cache.get(imageUrl);
	if (hit) {
		return new Response(hit.data, {
			headers: { 'Content-Type': hit.contentType, 'Cache-Control': 'max-age=3600' }
		});
	}

	const res = await fetch(imageUrl);
	if (!res.ok) return new Response(null, { status: 502 });

	const contentType = res.headers.get('content-type') ?? '';
	if (!contentType.startsWith('image/')) return new Response(null, { status: 502 });

	const contentLength = parseInt(res.headers.get('content-length') ?? '0');
	if (contentLength > MAX_SIZE) return new Response(null, { status: 502 });

	const data = await res.arrayBuffer();
	if (data.byteLength > MAX_SIZE) return new Response(null, { status: 502 });

	cache.set(imageUrl, { data, contentType });

	return new Response(data, {
		headers: { 'Content-Type': contentType, 'Cache-Control': 'max-age=3600' }
	});
};
