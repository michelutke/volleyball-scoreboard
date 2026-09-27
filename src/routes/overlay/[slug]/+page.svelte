<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { MatchState, SSEEvent, Team } from '$lib/types.js';
	import OverlayRenderer from '$lib/components/OverlayRenderer.svelte';

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

		const es = new EventSource(`/api/matches/${matchId}/stream`);

		es.onmessage = (event) => {
			const parsed: SSEEvent = JSON.parse(event.data);

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
		};

		return () => {
			es.close();
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
	<div class="overlay">
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
	.overlay {
		position: fixed;
		top: 30px;
		left: 30px;
		z-index: 9999;
	}
</style>
