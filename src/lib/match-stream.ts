import type { SSEEvent } from '$lib/types.js';

/** The server sends a ping every 15 s; this much silence means the connection died unnoticed. */
export const STREAM_SILENCE_TIMEOUT_MS = 40_000;
const WATCHDOG_INTERVAL_MS = 5_000;

interface MatchStreamOptions {
	onEvent: (event: SSEEvent) => void;
	createEventSource?: (url: string) => EventSource;
	now?: () => number;
}

/**
 * Live match events for overlays that run for hours unattended (e.g. inside the streaming app).
 * A dead connection on a mobile network often shows no error, so a watchdog reopens the stream
 * when even the server pings stop arriving. The server sends the current match state on every
 * connect, so nothing missed while disconnected needs reloading. Returns a function that closes the stream.
 */
export function openMatchStream(matchId: number, options: MatchStreamOptions): () => void {
	const createEventSource = options.createEventSource ?? ((url) => new EventSource(url));
	const now = options.now ?? Date.now;
	const url = `/api/matches/${matchId}/stream`;
	let source: EventSource;
	let lastActivityAt = now();

	function connect() {
		source = createEventSource(url);
		source.onopen = () => {
			lastActivityAt = now();
		};
		source.onmessage = (message) => {
			lastActivityAt = now();
			options.onEvent(JSON.parse(message.data) as SSEEvent);
		};
		source.addEventListener('ping', () => {
			lastActivityAt = now();
		});
	}

	connect();
	const watchdog = setInterval(() => {
		if (now() - lastActivityAt < STREAM_SILENCE_TIMEOUT_MS) return;
		source.close();
		lastActivityAt = now();
		connect();
	}, WATCHDOG_INTERVAL_MS);

	return () => {
		clearInterval(watchdog);
		source.close();
	};
}
