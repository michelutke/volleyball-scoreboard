import { sseEmitter } from '$lib/server/sse.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = () => {
	let unsubscribe: (() => void) | undefined;
	let keepalive: ReturnType<typeof setInterval> | undefined;

	const stream = new ReadableStream({
		start(controller) {
			const encoder = new TextEncoder();

			keepalive = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(': keepalive\n\n'));
				} catch {
					cleanup();
				}
			}, 15000);

			unsubscribe = sseEmitter.subscribe((event) => {
				try {
					controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
				} catch {
					cleanup();
				}
			});
		},
		cancel() {
			cleanup();
		}
	});

	function cleanup() {
		unsubscribe?.();
		if (keepalive) clearInterval(keepalive);
	}

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};
