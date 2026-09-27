<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import type { MatchState, SSEEvent, Team } from '$lib/types.js';
	import OverlayRenderer from '$lib/components/OverlayRenderer.svelte';

	let { data } = $props();

	const matchId = $derived(parseInt(page.params.matchId ?? '0'));

	// URL params for OBS positioning
	const x = $derived(parseInt(page.url.searchParams.get('x') ?? '30') || 30);
	const y = $derived(parseInt(page.url.searchParams.get('y') ?? '30') || 30);
	const scale = $derived(parseFloat(page.url.searchParams.get('scale') ?? '1') || 1);
	const anchor = $derived(page.url.searchParams.get('anchor') ?? 'tl');

	const overlayStyle = $derived((() => {
		const useRight = anchor === 'tr' || anchor === 'br';
		const useBottom = anchor === 'bl' || anchor === 'br';
		return [
			useRight ? `right: ${x}px` : `left: ${x}px`,
			useBottom ? `bottom: ${y}px` : `top: ${y}px`,
			`transform: scale(${scale})`,
			`transform-origin: ${useRight ? 'right' : 'left'} ${useBottom ? 'bottom' : 'top'}`
		].join('; ');
	})());

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
		};

		return () => {
			es.close();
			if (timeoutTimer) clearTimeout(timeoutTimer);
		};
	});
</script>

<svelte:head>
	<title>Overlay · Match #{matchId}</title>
	<style>
		html, body {
			background: transparent !important;
			margin: 0;
			overflow: hidden;
		}
	</style>
</svelte:head>

{#if match}
	<div class="overlay" style={overlayStyle}>
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
		z-index: 9999;
	}
</style>
