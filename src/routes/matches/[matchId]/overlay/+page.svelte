<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import type { MatchState, SSEEvent, Team } from '$lib/types.js';
	import ScoreboardDisplay from '$lib/components/ScoreboardDisplay.svelte';

	let { data } = $props();

	const matchId = $derived(parseInt(page.params.matchId ?? '0'));
	let match = $state<MatchState | null>(null);
	let homeTimeoutsUsed = $state(0);
	let guestTimeoutsUsed = $state(0);
	let prevSet = $state(0);

	$effect(() => {
		if (data.match) match = data.match;
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

	onMount(() => {
		const es = new EventSource(`/api/matches/${matchId}/stream`);

		es.onmessage = (event) => {
			const parsed: SSEEvent = JSON.parse(event.data);

			if (parsed.type === 'score' || parsed.type === 'match') {
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
		};

		return () => {
			es.close();
			if (timeoutTimer) clearTimeout(timeoutTimer);
		};
	});
</script>

<svelte:head>
	<title>Overlay — Match #{matchId}</title>
	<style>
		body {
			background: transparent !important;
			margin: 0;
			overflow: hidden;
		}
	</style>
</svelte:head>

{#if match}
	<div class="overlay">
		<ScoreboardDisplay
			{match}
			{homeTimeoutsUsed}
			{guestTimeoutsUsed}
			{timeoutTeam}
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
