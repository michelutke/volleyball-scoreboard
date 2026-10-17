import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { matches } from '$lib/server/db/schema.js';
import { matchSSEEmitter } from '$lib/server/sse.js';
import { acquireConnection, releaseConnection } from '$lib/server/connection-cap.js';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types.js';

const MAX_CONNECTIONS_PER_IP = 20;

/**
 * The per-IP cap only makes sense when adapter-node knows the real client IP (ADDRESS_HEADER set
 * behind the proxy). Without it every client shares the proxy IP and the cap would block all overlays.
 */
function capEnabled(): boolean {
	return !!env.ADDRESS_HEADER;
}

export const GET: RequestHandler = async ({ params, getClientAddress }) => {
	if (!/^\d+$/.test(params.matchId)) error(404, 'Match not found');
	const matchId = parseInt(params.matchId);

	const match = await db.query.matches.findFirst({
		where: eq(matches.id, matchId),
		columns: { id: true }
	});
	if (!match) error(404, 'Match not found');

	const clientAddress = capEnabled() ? getClientAddress() : null;
	if (clientAddress && !acquireConnection(clientAddress, MAX_CONNECTIONS_PER_IP)) {
		error(429, 'Too many connections');
	}

	let unsubscribe: (() => void) | undefined;
	let keepalive: ReturnType<typeof setInterval> | undefined;
	let released = false;

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

			unsubscribe = matchSSEEmitter.subscribe(matchId, (event) => {
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
		if (!released && clientAddress) {
			released = true;
			releaseConnection(clientAddress);
		}
	}

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};
