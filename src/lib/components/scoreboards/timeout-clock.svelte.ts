import type { Team } from '$lib/types.js';

const TIMEOUT_SECONDS = 30;

/** Counts a 30 s timeout down from the moment `team()` becomes non-null. Call during component init. */
export function timeoutClock(team: () => Team | null) {
	let left = $state(TIMEOUT_SECONDS);

	$effect(() => {
		if (!team()) return;
		left = TIMEOUT_SECONDS;
		const started = Date.now();
		const id = setInterval(() => {
			left = Math.max(0, TIMEOUT_SECONDS - Math.floor((Date.now() - started) / 1000));
		}, 250);
		return () => clearInterval(id);
	});

	return {
		get label() {
			return `0:${left.toString().padStart(2, '0')}`;
		}
	};
}
