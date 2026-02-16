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

class MatchSSEEmitter {
	private matchListeners = new Map<number, Set<Listener>>();

	subscribe(matchId: number, listener: Listener): () => void {
		if (!this.matchListeners.has(matchId)) {
			this.matchListeners.set(matchId, new Set());
		}
		this.matchListeners.get(matchId)!.add(listener);
		return () => {
			const set = this.matchListeners.get(matchId);
			if (set) {
				set.delete(listener);
				if (set.size === 0) this.matchListeners.delete(matchId);
			}
		};
	}

	emit(matchId: number, event: SSEEvent): void {
		const listeners = this.matchListeners.get(matchId);
		if (listeners) {
			for (const listener of listeners) {
				listener(event);
			}
		}
	}
}

// Legacy global emitter (for /control, /overlay)
export const sseEmitter = new SSEEmitter();

// Per-match emitter (for /matches/[matchId]/*)
export const matchSSEEmitter = new MatchSSEEmitter();

/** Emit to both per-match and legacy global listeners */
export function emitAll(matchId: number, event: SSEEvent): void {
	matchSSEEmitter.emit(matchId, event);
	sseEmitter.emit(event);
}
