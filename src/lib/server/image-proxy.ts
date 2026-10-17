import { lookup } from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import { BlockList, isIP } from 'node:net';
import type { LookupFunction } from 'node:net';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const FETCH_TIMEOUT_MS = 5000;
export const MAX_REDIRECTS = 3;

export const ALLOWED_IMAGE_TYPES = [
	'image/png',
	'image/jpeg',
	'image/gif',
	'image/webp',
	'image/avif'
] as const;

export const IMAGE_SECURITY_HEADERS = {
	'Content-Security-Policy': "default-src 'none'; sandbox",
	'X-Content-Type-Options': 'nosniff',
	'Content-Disposition': 'inline'
} as const;

const BLOCKED_HOSTNAMES = new Set([
	'localhost',
	'keycloak',
	'postgres',
	'db',
	'redis',
	'metadata.google.internal'
]);

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export class ImageProxyError extends Error {
	constructor(
		public readonly status: number,
		message: string
	) {
		super(message);
		this.name = 'ImageProxyError';
	}
}

const blockList = new BlockList();
for (const [network, prefix] of [
	['0.0.0.0', 8],
	['10.0.0.0', 8],
	['100.64.0.0', 10],
	['127.0.0.0', 8],
	['169.254.0.0', 16],
	['172.16.0.0', 12],
	['192.0.0.0', 24],
	['192.0.2.0', 24],
	['192.168.0.0', 16],
	['198.18.0.0', 15],
	['198.51.100.0', 24],
	['203.0.113.0', 24],
	['224.0.0.0', 4],
	['240.0.0.0', 4]
] as const) {
	blockList.addSubnet(network, prefix, 'ipv4');
}
blockList.addAddress('255.255.255.255', 'ipv4');
for (const [network, prefix] of [
	['::', 96],
	['64:ff9b::', 96],
	['fc00::', 7],
	['fe80::', 10],
	['ff00::', 8],
	['2001:db8::', 32]
] as const) {
	blockList.addSubnet(network, prefix, 'ipv6');
}

function expandIPv6(address: string): number[] | null {
	let addr = address;
	const lastColon = addr.lastIndexOf(':');
	const tail = addr.slice(lastColon + 1);
	if (tail.includes('.')) {
		const octets = tail.split('.').map(Number);
		if (octets.length !== 4 || octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
			return null;
		}
		const high = ((octets[0] << 8) | octets[1]).toString(16);
		const low = ((octets[2] << 8) | octets[3]).toString(16);
		addr = `${addr.slice(0, lastColon + 1)}${high}:${low}`;
	}
	const halves = addr.split('::');
	if (halves.length > 2) return null;
	const head = halves[0] ? halves[0].split(':') : [];
	const rest = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
	const missing = 8 - head.length - rest.length;
	if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
	const filler: string[] = halves.length === 2 ? new Array<string>(missing).fill('0') : [];
	const groups = [...head, ...filler, ...rest].map((group) => parseInt(group, 16));
	const valid = groups.length === 8 && groups.every((g) => Number.isInteger(g) && g >= 0 && g <= 0xffff);
	return valid ? groups : null;
}

export function isBlockedAddress(address: string): boolean {
	const family = isIP(address);
	if (family === 4) return blockList.check(address, 'ipv4');
	if (family !== 6) return true;
	const groups = expandIPv6(address);
	if (!groups) return true;
	const isMappedV4 = groups.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff;
	if (isMappedV4) {
		const embedded = `${groups[6] >> 8}.${groups[6] & 0xff}.${groups[7] >> 8}.${groups[7] & 0xff}`;
		return blockList.check(embedded, 'ipv4');
	}
	return blockList.check(groups.map((g) => g.toString(16)).join(':'), 'ipv6');
}

export function normalizeHostname(hostname: string): string {
	let host = hostname.toLowerCase();
	if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1);
	return host.replace(/\.+$/, '');
}

export function normalizeContentType(header: string | null | undefined): string {
	const type = (header ?? '').split(';')[0].trim().toLowerCase();
	return type === 'image/jpg' ? 'image/jpeg' : type;
}

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
	return signature.every((byte, i) => bytes[offset + i] === byte);
}

function ascii(text: string): number[] {
	return [...text].map((char) => char.charCodeAt(0));
}

function hasAvifBrand(bytes: Uint8Array): boolean {
	if (!startsWith(bytes, ascii('ftyp'), 4)) return false;
	const boxSize = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
	const end = Math.min(boxSize, bytes.length);
	for (let offset = 8; offset + 4 <= end; offset += 4) {
		if (offset === 12) continue;
		if (startsWith(bytes, ascii('avif'), offset) || startsWith(bytes, ascii('avis'), offset)) {
			return true;
		}
	}
	return false;
}

export function sniffImageType(bytes: Uint8Array): (typeof ALLOWED_IMAGE_TYPES)[number] | null {
	if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
	if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
	if (startsWith(bytes, ascii('GIF87a')) || startsWith(bytes, ascii('GIF89a'))) return 'image/gif';
	if (startsWith(bytes, ascii('RIFF')) && startsWith(bytes, ascii('WEBP'), 8)) return 'image/webp';
	if (hasAvifBrand(bytes)) return 'image/avif';
	return null;
}

interface ResolvedTarget {
	url: URL;
	host: string;
	addresses: { address: string; family: number }[];
}

function raceAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const onAbort = () => reject(new ImageProxyError(502, 'timeout'));
		if (signal.aborted) return onAbort();
		signal.addEventListener('abort', onAbort, { once: true });
		promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
	});
}

export async function resolveTarget(
	urlString: string,
	options: { allowHttp: boolean; signal: AbortSignal }
): Promise<ResolvedTarget> {
	let url: URL;
	try {
		url = new URL(urlString);
	} catch {
		throw new ImageProxyError(403, 'invalid url');
	}
	const protocolAllowed =
		url.protocol === 'https:' || (options.allowHttp && url.protocol === 'http:');
	if (!protocolAllowed) throw new ImageProxyError(403, 'scheme not allowed');

	const host = normalizeHostname(url.hostname);
	if (!host || BLOCKED_HOSTNAMES.has(host)) throw new ImageProxyError(403, 'host not allowed');

	const family = isIP(host);
	if (family) {
		if (isBlockedAddress(host)) throw new ImageProxyError(403, 'address not allowed');
		return { url, host, addresses: [{ address: host, family }] };
	}

	let addresses: { address: string; family: number }[];
	try {
		addresses = await raceAbort(lookup(host, { all: true }), options.signal);
	} catch (error) {
		if (error instanceof ImageProxyError) throw error;
		throw new ImageProxyError(502, 'dns lookup failed');
	}
	if (addresses.length === 0) throw new ImageProxyError(502, 'dns lookup failed');
	if (addresses.some(({ address }) => isBlockedAddress(address))) {
		throw new ImageProxyError(403, 'address not allowed');
	}
	return { url, host, addresses };
}

function pinnedLookup(addresses: ResolvedTarget['addresses']): LookupFunction {
	return (_hostname, options, callback) => {
		if (options.all) {
			callback(null, addresses);
			return;
		}
		callback(null, addresses[0].address, addresses[0].family);
	};
}

function requestOnce(target: ResolvedTarget, signal: AbortSignal): Promise<http.IncomingMessage> {
	const { url, host, addresses } = target;
	const transport = url.protocol === 'https:' ? https : http;
	return new Promise((resolve, reject) => {
		const req = transport.request({
			host,
			port: url.port || undefined,
			path: `${url.pathname}${url.search}`,
			method: 'GET',
			headers: { accept: '*/*', 'user-agent': 'node' },
			lookup: pinnedLookup(addresses),
			agent: false,
			signal
		});
		req.once('response', resolve);
		req.once('error', () => reject(new ImageProxyError(502, 'upstream request failed')));
		req.end();
	});
}

async function readBody(res: http.IncomingMessage): Promise<Uint8Array> {
	const chunks: Buffer[] = [];
	let total = 0;
	try {
		for await (const chunk of res) {
			const buffer = Buffer.from(chunk);
			total += buffer.byteLength;
			if (total > MAX_IMAGE_BYTES) {
				res.destroy();
				throw new ImageProxyError(502, 'image too large');
			}
			chunks.push(buffer);
		}
	} catch (error) {
		if (error instanceof ImageProxyError) throw error;
		throw new ImageProxyError(502, 'upstream read failed');
	}
	return new Uint8Array(Buffer.concat(chunks));
}

export interface FetchedImage {
	data: Uint8Array;
	contentType: string;
}

export async function fetchImage(
	urlString: string,
	options: { allowHttp?: boolean; timeoutMs?: number } = {}
): Promise<FetchedImage> {
	const signal = AbortSignal.timeout(options.timeoutMs ?? FETCH_TIMEOUT_MS);
	const allowHttp = options.allowHttp ?? false;
	let current = urlString;

	for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
		const target = await resolveTarget(current, { allowHttp, signal });
		const res = await requestOnce(target, signal);
		const status = res.statusCode ?? 0;

		if (REDIRECT_STATUSES.has(status)) {
			res.destroy();
			const location = res.headers.location;
			if (!location) throw new ImageProxyError(502, 'redirect without location');
			if (hop === MAX_REDIRECTS) throw new ImageProxyError(502, 'too many redirects');
			try {
				current = new URL(location, target.url).toString();
			} catch {
				throw new ImageProxyError(403, 'invalid url');
			}
			continue;
		}

		if (status < 200 || status > 299) {
			res.destroy();
			throw new ImageProxyError(502, 'upstream error');
		}

		const contentType = normalizeContentType(res.headers['content-type']);
		if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(contentType)) {
			res.destroy();
			throw new ImageProxyError(415, 'unsupported media type');
		}

		const contentLength = parseInt(res.headers['content-length'] ?? '0');
		if (contentLength > MAX_IMAGE_BYTES) {
			res.destroy();
			throw new ImageProxyError(502, 'image too large');
		}

		const data = await readBody(res);
		if (sniffImageType(data) !== contentType) {
			throw new ImageProxyError(415, 'content does not match declared type');
		}
		return { data, contentType };
	}

	throw new ImageProxyError(502, 'too many redirects');
}
