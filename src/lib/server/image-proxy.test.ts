import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const dnsLookupMock = vi.hoisted(() => vi.fn());
const httpsRequestMock = vi.hoisted(() => vi.fn());

vi.mock('node:dns/promises', () => ({ lookup: dnsLookupMock }));
vi.mock('node:https', () => ({ default: { request: httpsRequestMock } }));
vi.mock('$env/dynamic/private', () => ({ env: {} }));

const { fetchImage, isBlockedAddress, sniffImageType, ImageProxyError, MAX_IMAGE_BYTES } =
	await import('./image-proxy.js');
const { GET } = await import('../../routes/api/image-proxy/+server.js');

const PNG = Buffer.concat([
	Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
	Buffer.from('rest-of-png')
]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
const GIF = Buffer.from('GIF89a-data');
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]);
const AVIF = Buffer.concat([
	Buffer.from([0, 0, 0, 24]),
	Buffer.from('ftypavif'),
	Buffer.alloc(4),
	Buffer.from('mif1avif')
]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

interface FakeResponse {
	status?: number;
	headers?: Record<string, string>;
	body?: Buffer | Buffer[];
	hang?: boolean;
}

interface RequestOptions {
	host: string;
	lookup: (
		host: string,
		options: { all?: boolean },
		cb: (err: Error | null, address: unknown, family?: number) => void
	) => void;
	signal?: AbortSignal;
}

let responses: FakeResponse[] = [];
let destroyedResponses: Readable[] = [];
let requestedHosts: string[] = [];
let requestOptions: RequestOptions[] = [];

function mockUpstream(...queue: FakeResponse[]) {
	responses = queue;
}

function mockDns(table: Record<string, { address: string; family: number }[]>) {
	dnsLookupMock.mockImplementation(
		async (host: string) => table[host] ?? [{ address: '93.184.216.34', family: 4 }]
	);
}

beforeEach(() => {
	vi.clearAllMocks();
	responses = [];
	destroyedResponses = [];
	requestedHosts = [];
	requestOptions = [];
	mockDns({});
	httpsRequestMock.mockImplementation((options: RequestOptions) => {
		requestedHosts.push(options.host);
		requestOptions.push(options);
		const req = new EventEmitter() as EventEmitter & { end: () => void };
		req.end = () => {
			const next = responses.shift();
			if (!next) {
				req.emit('error', new Error('unexpected request'));
				return;
			}
			if (next.hang) {
				options.signal?.addEventListener('abort', () => req.emit('error', new Error('aborted')));
				return;
			}
			const chunks = Array.isArray(next.body) ? next.body : [next.body ?? Buffer.alloc(0)];
			const res = Readable.from(chunks, { objectMode: false }) as Readable & {
				statusCode: number;
				headers: Record<string, string>;
			};
			res.statusCode = next.status ?? 200;
			res.headers = next.headers ?? {};
			const destroy = res.destroy.bind(res);
			res.destroy = (error?: Error) => {
				destroyedResponses.push(res);
				return destroy(error);
			};
			setImmediate(() => req.emit('response', res));
		};
		return req;
	});
});

const png = (extra: Record<string, string> = {}): FakeResponse => ({
	headers: { 'content-type': 'image/png', ...extra },
	body: PNG
});

describe('isBlockedAddress', () => {
	it.each([
		'0.0.0.0',
		'10.1.2.3',
		'100.64.0.1',
		'127.0.0.1',
		'169.254.169.254',
		'172.16.0.1',
		'172.31.255.255',
		'192.0.0.1',
		'192.0.2.1',
		'192.168.1.1',
		'198.18.0.1',
		'198.51.100.1',
		'203.0.113.1',
		'224.0.0.1',
		'240.0.0.1',
		'255.255.255.255',
		'::',
		'::1',
		'::ffff:127.0.0.1',
		'::ffff:7f00:1',
		'::ffff:10.0.0.1',
		'64:ff9b::1',
		'fc00::1',
		'fd00::1',
		'fe80::1',
		'ff02::1',
		'2001:db8::1',
		'not-an-ip'
	])('blocks %s', (address) => {
		expect(isBlockedAddress(address)).toBe(true);
	});

	it.each(['93.184.216.34', '8.8.8.8', '172.32.0.1', '100.63.255.255', '::ffff:8.8.8.8', '2606:4700::1111'])(
		'allows %s',
		(address) => {
			expect(isBlockedAddress(address)).toBe(false);
		}
	);
});

describe('sniffImageType', () => {
	it('detects the allowed raster formats', () => {
		expect(sniffImageType(PNG)).toBe('image/png');
		expect(sniffImageType(JPEG)).toBe('image/jpeg');
		expect(sniffImageType(GIF)).toBe('image/gif');
		expect(sniffImageType(WEBP)).toBe('image/webp');
		expect(sniffImageType(AVIF)).toBe('image/avif');
	});

	it('returns null for svg and unknown data', () => {
		expect(sniffImageType(SVG)).toBeNull();
		expect(sniffImageType(Buffer.alloc(0))).toBeNull();
	});
});

describe('fetchImage validation', () => {
	it.each([
		['https://[::1]/logo.png'],
		['https://[::ffff:127.0.0.1]/logo.png'],
		['https://localhost./logo.png'],
		['https://keycloak./logo.png'],
		['https://100.64.0.1/logo.png'],
		['https://[fd00::1]/logo.png'],
		['https://127.1/logo.png'],
		['https://2130706433/logo.png'],
		['http://example.com/logo.png'],
		['ftp://example.com/logo.png'],
		['not a url']
	])('rejects %s without connecting', async (url) => {
		mockUpstream(png());
		await expect(fetchImage(url)).rejects.toMatchObject({ status: 403 });
		expect(httpsRequestMock).not.toHaveBeenCalled();
	});

	it('rejects a DNS name resolving to a private address', async () => {
		mockDns({ '127.0.0.1.nip.io': [{ address: '127.0.0.1', family: 4 }] });
		mockUpstream(png());
		await expect(fetchImage('https://127.0.0.1.nip.io/logo.png')).rejects.toMatchObject({
			status: 403
		});
		expect(httpsRequestMock).not.toHaveBeenCalled();
	});

	it('rejects when any resolved address is private', async () => {
		mockDns({
			'mixed.example.com': [
				{ address: '93.184.216.34', family: 4 },
				{ address: '10.0.0.5', family: 4 }
			]
		});
		await expect(fetchImage('https://mixed.example.com/logo.png')).rejects.toMatchObject({
			status: 403
		});
	});

	it('returns 502 when DNS fails', async () => {
		dnsLookupMock.mockRejectedValue(new Error('ENOTFOUND'));
		await expect(fetchImage('https://missing.example.com/logo.png')).rejects.toMatchObject({
			status: 502
		});
	});

	it('allows http only when allowHttp is set', async () => {
		mockUpstream(png());
		await expect(
			fetchImage('http://example.com/logo.png', { allowHttp: false })
		).rejects.toMatchObject({ status: 403 });
	});
});

describe('fetchImage fetching', () => {
	it('fetches a png and pins the validated address', async () => {
		mockDns({ 'cdn.example.com': [{ address: '93.184.216.34', family: 4 }] });
		mockUpstream(png());
		const image = await fetchImage('https://cdn.example.com/logo.png');
		expect(image.contentType).toBe('image/png');
		expect(Buffer.from(image.data)).toEqual(PNG);
		expect(requestedHosts).toEqual(['cdn.example.com']);

		const pinned = vi.fn();
		requestOptions[0].lookup('cdn.example.com', { all: true }, pinned);
		expect(pinned).toHaveBeenCalledWith(null, [{ address: '93.184.216.34', family: 4 }]);
		const single = vi.fn();
		requestOptions[0].lookup('cdn.example.com', {}, single);
		expect(single).toHaveBeenCalledWith(null, '93.184.216.34', 4);
		expect(dnsLookupMock).toHaveBeenCalledTimes(1);
	});

	it('ignores content-type params and accepts image/jpg for jpeg data', async () => {
		mockUpstream({ headers: { 'content-type': 'image/jpg; charset=binary' }, body: JPEG });
		const image = await fetchImage('https://cdn.example.com/logo.jpg');
		expect(image.contentType).toBe('image/jpeg');
	});

	it.each([
		['image/gif', GIF],
		['image/webp', WEBP],
		['image/avif', AVIF]
	])('accepts %s', async (contentType, body) => {
		mockUpstream({ headers: { 'content-type': contentType }, body });
		const image = await fetchImage('https://cdn.example.com/logo');
		expect(image.contentType).toBe(contentType);
	});

	it('rejects svg with 415', async () => {
		mockUpstream({ headers: { 'content-type': 'image/svg+xml' }, body: SVG });
		await expect(fetchImage('https://cdn.example.com/logo.svg')).rejects.toMatchObject({
			status: 415
		});
	});

	it('rejects svg served as a raster type', async () => {
		mockUpstream({ headers: { 'content-type': 'image/png' }, body: SVG });
		await expect(fetchImage('https://cdn.example.com/logo.png')).rejects.toMatchObject({
			status: 415
		});
	});

	it('rejects a magic byte mismatch', async () => {
		mockUpstream({ headers: { 'content-type': 'image/png' }, body: JPEG });
		await expect(fetchImage('https://cdn.example.com/logo.png')).rejects.toBeInstanceOf(
			ImageProxyError
		);
	});

	it('returns 502 for upstream errors', async () => {
		mockUpstream({ status: 500 });
		await expect(fetchImage('https://cdn.example.com/logo.png')).rejects.toMatchObject({
			status: 502
		});
	});

	it('rejects early on a large content-length', async () => {
		mockUpstream(png({ 'content-length': String(MAX_IMAGE_BYTES + 1) }));
		await expect(fetchImage('https://cdn.example.com/logo.png')).rejects.toMatchObject({
			status: 502
		});
		expect(destroyedResponses).toHaveLength(1);
	});

	it('aborts a body over 5 MB', async () => {
		const chunk = Buffer.concat([PNG, Buffer.alloc(3 * 1024 * 1024)]);
		mockUpstream({ headers: { 'content-type': 'image/png' }, body: [chunk, chunk] });
		await expect(fetchImage('https://cdn.example.com/logo.png')).rejects.toMatchObject({
			status: 502
		});
		expect(destroyedResponses).toHaveLength(1);
	});

	it('times out a hanging upstream', async () => {
		mockUpstream({ hang: true });
		await expect(
			fetchImage('https://cdn.example.com/logo.png', { timeoutMs: 20 })
		).rejects.toMatchObject({ status: 502 });
	});
});

describe('fetchImage redirects', () => {
	const redirect = (location: string): FakeResponse => ({ status: 302, headers: { location } });

	it('follows a redirect after revalidating the new host', async () => {
		mockUpstream(redirect('https://img.example.com/real.png'), png());
		const image = await fetchImage('https://cdn.example.com/logo.png');
		expect(image.contentType).toBe('image/png');
		expect(requestedHosts).toEqual(['cdn.example.com', 'img.example.com']);
		expect(dnsLookupMock).toHaveBeenCalledTimes(2);
	});

	it('resolves relative redirect locations', async () => {
		mockUpstream(redirect('/other.png'), png());
		await fetchImage('https://cdn.example.com/logo.png');
		expect(requestedHosts).toEqual(['cdn.example.com', 'cdn.example.com']);
	});

	it('rejects a redirect to http://127.0.0.1', async () => {
		mockUpstream(redirect('http://127.0.0.1/secret'), png());
		await expect(
			fetchImage('https://cdn.example.com/logo.png', { allowHttp: true })
		).rejects.toMatchObject({ status: 403 });
		expect(requestedHosts).toEqual(['cdn.example.com']);
	});

	it('rejects a redirect to a name resolving to a private address', async () => {
		mockDns({ 'evil.example.com': [{ address: '192.168.0.10', family: 4 }] });
		mockUpstream(redirect('https://evil.example.com/x.png'), png());
		await expect(fetchImage('https://cdn.example.com/logo.png')).rejects.toMatchObject({
			status: 403
		});
		expect(requestedHosts).toEqual(['cdn.example.com']);
	});

	it('allows three redirects', async () => {
		mockUpstream(
			redirect('https://a.example.com/1'),
			redirect('https://b.example.com/2'),
			redirect('https://c.example.com/3'),
			png()
		);
		const image = await fetchImage('https://cdn.example.com/logo.png');
		expect(image.contentType).toBe('image/png');
	});

	it('rejects a redirect chain longer than 3', async () => {
		mockUpstream(
			redirect('https://a.example.com/1'),
			redirect('https://b.example.com/2'),
			redirect('https://c.example.com/3'),
			redirect('https://d.example.com/4'),
			png()
		);
		await expect(fetchImage('https://cdn.example.com/logo.png')).rejects.toMatchObject({
			status: 502
		});
		expect(requestedHosts).toHaveLength(4);
	});
});

describe('GET /api/image-proxy', () => {
	const call = (imageUrl?: string) =>
		GET({
			url: new URL(
				`http://localhost/api/image-proxy${imageUrl ? `?url=${encodeURIComponent(imageUrl)}` : ''}`
			)
		} as unknown as Parameters<typeof GET>[0]);

	const expectHardenedHeaders = (res: Response) => {
		expect(res.headers.get('content-security-policy')).toBe("default-src 'none'; sandbox");
		expect(res.headers.get('x-content-type-options')).toBe('nosniff');
		expect(res.headers.get('content-disposition')).toBe('inline');
	};

	it('returns 400 without a url', async () => {
		const res = await call();
		expect(res.status).toBe(400);
		expectHardenedHeaders(res);
	});

	it('rejects svg with 415 and hardened headers', async () => {
		mockUpstream({ headers: { 'content-type': 'image/svg+xml' }, body: SVG });
		const res = await call('https://route.example.com/logo.svg');
		expect(res.status).toBe(415);
		expectHardenedHeaders(res);
	});

	it('returns 403 for a blocked host with hardened headers', async () => {
		const res = await call('https://[::1]/logo.png');
		expect(res.status).toBe(403);
		expectHardenedHeaders(res);
	});

	it('returns 502 without details when the upstream fails', async () => {
		mockUpstream({ status: 500 });
		const res = await call('https://route.example.com/broken.png');
		expect(res.status).toBe(502);
		expect(await res.text()).toBe('');
		expectHardenedHeaders(res);
	});

	it('serves a png with the sandbox CSP, then serves it from cache', async () => {
		mockUpstream(png());
		const first = await call('https://route.example.com/logo.png');
		expect(first.status).toBe(200);
		expect(first.headers.get('content-type')).toBe('image/png');
		expect(first.headers.get('cache-control')).toBe('max-age=3600');
		expectHardenedHeaders(first);
		expect(Buffer.from(await first.arrayBuffer())).toEqual(PNG);

		const second = await call('https://route.example.com/logo.png');
		expect(second.status).toBe(200);
		expectHardenedHeaders(second);
		expect(httpsRequestMock).toHaveBeenCalledTimes(1);
	});
});
