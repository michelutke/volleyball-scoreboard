import type { MatchState } from '$lib/types.js';

export interface ScoreHistoryRow {
	homePoints: number;
	guestPoints: number;
	homeSets: number;
	guestSets: number;
	currentSet: number;
	createdAt: Date;
}

interface Timestamped {
	createdAt: Date;
}

/**
 * Applies a score action answered by the server to the local history, so the control pages only
 * redraw what changed instead of reloading every query. Returns null when the page has to reload:
 * a set change resets the timeouts of the new set, a reset or status change touches more than the score.
 */
export function applyScoreAction<T extends ScoreHistoryRow>(
	history: T[],
	timeoutHistory: Timestamped[],
	action: string,
	previous: MatchState,
	updated: MatchState,
	now: Date = new Date()
): ScoreHistoryRow[] | null {
	if (action === 'reset') return null;
	if (updated.currentSet !== previous.currentSet || updated.status !== previous.status) return null;
	if (action === 'undo') return history.slice(0, -1);
	return [...history, { ...scoreFields(updated), createdAt: nextTimestamp(history, timeoutHistory, now) }];
}

function scoreFields(state: MatchState): Omit<ScoreHistoryRow, 'createdAt'> {
	return {
		homePoints: state.homePoints,
		guestPoints: state.guestPoints,
		homeSets: state.homeSets,
		guestSets: state.guestSets,
		currentSet: state.currentSet
	};
}

// The server stamped the real row; a phone clock behind the server must not sort the point before
// an earlier timeout, so the local stamp is never older than the newest known event.
function nextTimestamp(history: Timestamped[], timeoutHistory: Timestamped[], now: Date): Date {
	const latest = Math.max(
		history.at(-1)?.createdAt.getTime() ?? 0,
		timeoutHistory.at(-1)?.createdAt.getTime() ?? 0
	);
	return new Date(Math.max(now.getTime(), latest + 1));
}
