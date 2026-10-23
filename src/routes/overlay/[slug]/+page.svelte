<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import type { MatchState, SSEEvent, Team } from '$lib/types.js';
	import OverlayRenderer from '$lib/components/OverlayRenderer.svelte';
	import { openMatchStream } from '$lib/match-stream.js';

	let { data } = $props();

	let match = $state<MatchState | null>(null);
	let homeTimeoutsUsed = $state(0);
	let guestTimeoutsUsed = $state(0);
	let prevSet = $state(0);

	$effect(() => {
		match = data.match ?? null;
		homeTimeoutsUsed = data.timeouts?.home ?? 0;
		guestTimeoutsUsed = data.timeouts?.guest ?? 0;
		if (data.match) prevSet = data.match.currentSet;
	});

	let timeoutTeam = $state<Team | null>(null);
	let timeoutTimer = $state<ReturnType<typeof setTimeout> | null>(null);

	function startTimeout(team: Team) {
		if (timeoutTimer) clearTimeout(timeoutTimer);
		timeoutTeam = team;
		timeoutTimer = setTimeout(() => {
			timeoutTeam = null;
			timeoutTimer = null;
		}, 30000);
	}

	$effect(() => {
		const matchId = data.matchId;
		if (!matchId) return;

		const closeStream = openMatchStream(matchId, { onEvent: handleEvent });

		function handleEvent(parsed: SSEEvent) {
			if (parsed.type === 'design') {
				invalidateAll();
			}

			if (parsed.type === 'score' || parsed.type === 'match') {
				if (parsed.type === 'match' && parsed.data.designTemplateId !== data.templateId) {
					invalidateAll();
				}
				const newSet = parsed.data.currentSet;
				if (newSet !== prevSet) {
					homeTimeoutsUsed = 0;
					guestTimeoutsUsed = 0;
					prevSet = newSet;
				}
				match = parsed.data;
			}

			if (parsed.type === 'timeout') {
				if (parsed.data.active === false) {
					timeoutTeam = null;
					if (timeoutTimer) clearTimeout(timeoutTimer);
					timeoutTimer = null;
					if (parsed.data.team === 'home') homeTimeoutsUsed = Math.max(0, homeTimeoutsUsed - 1);
					else guestTimeoutsUsed = Math.max(0, guestTimeoutsUsed - 1);
				} else {
					startTimeout(parsed.data.team);
					if (parsed.data.team === 'home') homeTimeoutsUsed++;
					else guestTimeoutsUsed++;
				}
			}

			if (parsed.type === 'permalink') {
				invalidateAll();
			}
		}

		return () => {
			closeStream();
			if (timeoutTimer) clearTimeout(timeoutTimer);
		};
	});

	$effect(() => {
		if (data.matchId) return;
		const interval = setInterval(() => invalidateAll(), 15000);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Overlay</title>
	<style>
		html, body {
			background: transparent !important;
			margin: 0;
			overflow: hidden;
		}
	</style>
</svelte:head>

{#if match}
	<div class="overlay" class:safe={page.url.searchParams.get('safe') === '1'}>
		<OverlayRenderer
			{match}
			{homeTimeoutsUsed}
			{guestTimeoutsUsed}
			{timeoutTeam}
			customCode={data.customCode}
			templateId={data.templateId}
			layoutId={data.scoreboardLayout}
			options={(data.scoreboardOptions ?? {}) as Record<string, string | number | boolean>}
		/>
	</div>
{/if}

<style>
	/* Fixed anchor: the app lays the WebView out at a user-placed box, so the default must not
	   depend on the viewport. Full-frame OBS sources opt into the brand safe areas with ?safe=1. */
	.overlay {
		position: fixed;
		top: 30px;
		left: 30px;
		z-index: 9999;
	}
	/* Brand safe areas (manual p26): 16:9 title safe 5 % (96, 54 at 1080p); 9:16 bug at 64, 240 */
	.overlay.safe {
		top: 5vh;
		left: 5vw;
	}
	@media (orientation: portrait) {
		.overlay.safe {
			top: 12.5vh;
			left: 5.926vw;
		}
	}
</style>
