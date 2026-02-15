import type { SSEEvent } from '$lib/types.js';

type Listener = (event: SSEEvent) => void;

class SSEEmitter {
	private listeners = new Set<Listener>();

	subscribe(listener: Listener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	emit(event: SSEEvent): void {
		for (const listener of this.listeners) {
			listener(event);
		}
	}
}

export const sseEmitter = new SSEEmitter();
