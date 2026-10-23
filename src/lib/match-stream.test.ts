import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import type { SSEEvent } from '$lib/types.js';
import { openMatchStream, STREAM_SILENCE_TIMEOUT_MS } from './match-stream.js';

class FakeEventSource {
	onopen: (() => void) | null = null;
	onmessage: ((message: { data: string }) => void) | null = null;
	closed = false;
	private listeners = new Map<string, () => void>();

	constructor(public url: string) {}

	addEventListener(type: string, listener: () => void) {
		this.listeners.set(type, listener);
	}

	close() {
		this.closed = true;
	}

	emitPing() {
		this.listeners.get('ping')?.();
	}
}

describe('openMatchStream', () => {
	let sources: FakeEventSource[];
	let onEvent: Mock<(event: SSEEvent) => void>;
	let close: () => void;

	beforeEach(() => {
		vi.useFakeTimers();
		sources = [];
		onEvent = vi.fn<(event: SSEEvent) => void>();
		close = openMatchStream(88, {
			onEvent,
			createEventSource: (url) => {
				const source = new FakeEventSource(url);
				sources.push(source);
				return source as unknown as EventSource;
			}
		});
	});

	afterEach(() => {
		close();
		vi.useRealTimers();
	});

	it('connects to the match stream and forwards events', () => {
		expect(sources[0].url).toBe('/api/matches/88/stream');
		sources[0].onmessage?.({ data: JSON.stringify({ type: 'design' }) });
		expect(onEvent).toHaveBeenCalledWith({ type: 'design' });
	});

	it('keeps the connection while pings arrive', () => {
		sources[0].onopen?.();
		for (let i = 0; i < 10; i++) {
			vi.advanceTimersByTime(15_000);
			sources[0].emitPing();
		}
		expect(sources).toHaveLength(1);
	});

	it('reopens a silent connection', () => {
		sources[0].onopen?.();
		vi.advanceTimersByTime(STREAM_SILENCE_TIMEOUT_MS + 5_000);
		expect(sources[0].closed).toBe(true);
		expect(sources).toHaveLength(2);
	});

	it('closes the stream and stops the watchdog', () => {
		close();
		expect(sources[0].closed).toBe(true);
		vi.advanceTimersByTime(STREAM_SILENCE_TIMEOUT_MS * 3);
		expect(sources).toHaveLength(1);
	});
});
