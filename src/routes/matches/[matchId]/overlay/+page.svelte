<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import type { MatchState, SSEEvent, Team } from '$lib/types.js';
	import ScoreboardDisplay from '$lib/components/ScoreboardDisplay.svelte';

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
	let iframeEl = $state<HTMLIFrameElement | null>(null);

	function startTimeout(team: Team) {
		if (timeoutTimer) clearTimeout(timeoutTimer);
		timeoutTeam = team;
		timeoutTimer = setTimeout(() => {
			timeoutTeam = null;
			timeoutTimer = null;
		}, 30000);
	}

	function buildOverlayData(m: MatchState, ht: number, gt: number, tt: Team | null) {
		const homeMax = m.homeSets;
		const guestMax = m.guestSets;
		const totalSets = homeMax + guestMax;
		const isMatchPoint =
			m.status === 'live' &&
			((m.homePoints >= 14 && m.homePoints > m.guestPoints && m.homeSets === 2) ||
				(m.guestPoints >= 14 && m.guestPoints > m.homePoints && m.guestSets === 2));
		const isSetPoint =
			!isMatchPoint &&
			m.status === 'live' &&
			((m.homePoints >= 24 && m.homePoints > m.guestPoints) ||
				(m.guestPoints >= 24 && m.guestPoints > m.homePoints) ||
				(m.currentSet === 5 && ((m.homePoints >= 14 && m.homePoints > m.guestPoints) || (m.guestPoints >= 14 && m.guestPoints > m.homePoints))));

		return {
			homeTeam: m.homeTeamName,
			guestTeam: m.guestTeamName,
			homePoints: m.homePoints,
			guestPoints: m.guestPoints,
			homeSets: m.homeSets,
			guestSets: m.guestSets,
			currentSet: m.currentSet,
			setScores: m.setScores.map((s) => ({ home: s.home, guest: s.guest })),
			serviceTeam: m.serviceTeam,
			status: m.status,
			homeJerseyColor: m.homeJerseyColor,
			guestJerseyColor: m.guestJerseyColor,
			homeTeamLogo: m.homeTeamLogo,
			guestTeamLogo: m.guestTeamLogo,
			timeout: { active: tt !== null, team: tt },
			isSetPoint,
			isMatchPoint
		};
	}

	function postToIframe(m: MatchState) {
		if (!iframeEl?.contentWindow) return;
		iframeEl.contentWindow.postMessage(
			{ type: 'matchState', data: buildOverlayData(m, homeTimeoutsUsed, guestTimeoutsUsed, timeoutTeam) },
			'*'
		);
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
				if (data.customCode && match) postToIframe(match);
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
				if (data.customCode && match) postToIframe(match);
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
		html, body {
			background: transparent !important;
			margin: 0;
			overflow: hidden;
		}
	</style>
</svelte:head>

{#if match}
	<div class="overlay" style={overlayStyle}>
		{#if data.customCode && data.templateId}
			<iframe
				bind:this={iframeEl}
				src="/api/overlay-sandbox/{data.templateId}"
				sandbox="allow-scripts"
				title="Custom overlay"
				onload={() => { if (match) postToIframe(match); }}
			></iframe>
		{:else}
			<ScoreboardDisplay
				{match}
				{homeTimeoutsUsed}
				{guestTimeoutsUsed}
				{timeoutTeam}
				layoutId={data.scoreboardLayout}
				options={(data.scoreboardOptions ?? {}) as Record<string, string | number | boolean>}
			/>
		{/if}
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		z-index: 9999;
	}
	iframe {
		border: none;
		background: transparent;
		width: 100vw;
		height: 100vh;
	}
</style>
