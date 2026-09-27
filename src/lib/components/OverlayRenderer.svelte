<script lang="ts">
	import type { MatchState, Team } from '$lib/types.js';
	import ScoreboardDisplay from '$lib/components/ScoreboardDisplay.svelte';

	interface Props {
		match: MatchState;
		homeTimeoutsUsed: number;
		guestTimeoutsUsed: number;
		timeoutTeam: Team | null;
		customCode: string | null;
		templateId: number | null;
		layoutId?: string | null;
		options?: Record<string, string | number | boolean>;
	}

	let {
		match,
		homeTimeoutsUsed,
		guestTimeoutsUsed,
		timeoutTeam,
		customCode,
		templateId,
		layoutId = null,
		options = {}
	}: Props = $props();

	let iframeEl = $state<HTMLIFrameElement | null>(null);

	function buildOverlayData(m: MatchState, ht: number, gt: number, tt: Team | null) {
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

	$effect(() => {
		if (customCode) postToIframe(match);
	});
</script>

{#if customCode && templateId}
	<iframe
		bind:this={iframeEl}
		src="/api/overlay-sandbox/{templateId}"
		sandbox="allow-scripts"
		title="Custom overlay"
		onload={() => postToIframe(match)}
	></iframe>
{:else}
	<ScoreboardDisplay
		{match}
		{homeTimeoutsUsed}
		{guestTimeoutsUsed}
		{timeoutTeam}
		{layoutId}
		{options}
	/>
{/if}

<style>
	iframe {
		border: none;
		background: transparent;
		width: 100vw;
		height: 100vh;
	}
</style>
