import type { SSEEvent } from '$lib/types.js';

type Listener = (event: SSEEvent) => void;

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

// Per-match emitter (for /matches/[matchId]/*)
export const matchSSEEmitter = new MatchSSEEmitter();

export function emitAll(matchId: number, event: SSEEvent): void {
	matchSSEEmitter.emit(matchId, event);
}
