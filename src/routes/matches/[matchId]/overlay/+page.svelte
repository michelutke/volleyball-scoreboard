<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import type { MatchState, SSEEvent, Team } from '$lib/types.js';

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
	let setScoresExpanded = $derived(match?.showSetScores || match?.status === 'finished' || !!timeoutTeam);

	function darkenHex(hex: string, amount = 16): string {
		const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
		const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
		const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
		return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
	}

	function lightenHex(hex: string, amount = 16): string {
		const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
		const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
		const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
		return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
	}

	function hexWithAlpha(hex: string, alpha: number): string {
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		return `rgba(${r},${g},${b},${alpha})`;
	}

	function overlayBgStyle(m: MatchState, dark = false): string {
		const c1 = dark ? darkenHex(m.overlayBg) : m.overlayBg;
		const c2 = dark ? darkenHex(m.overlayBg2) : m.overlayBg2;
		return m.overlayBgGradient ? `linear-gradient(to right, ${c1}, ${c2})` : c1;
	}

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
		<div class="scoreboard" class:with-jersey={match.showJerseyColors} class:rounded={match.overlayRounded} style:--overlay-text={match.overlayText} style:--overlay-border={match.overlayDivider}>
			<!-- Home Team Row -->
			<div class="team-row home-row">
				{#if match.showJerseyColors}
					<div class="jersey" style:background-color={match.homeJerseyColor}></div>
				{/if}
				<div class="team-name" style:background={overlayBgStyle(match, true)} style:color={match.overlayText}>
					<span>{match.homeTeamName.toUpperCase()}</span>
					<img src="/vbcthun-ball.svg" alt="Service" class="service-icon" class:service-hidden={match.serviceTeam !== 'home'} />
				</div>
				<div class="sets" style:background-color={match.overlaySatsBg} style:color={match.overlayText}>{match.homeSets}</div>
				<div class="set-scores-container" class:expanded={setScoresExpanded}>
					{#each match.setScores as s}
						<div class="set-score-cell" class:set-score-winner={s.home > s.guest} style:--winner-color={match.homeJerseyColor} style:background-color={match.overlaySetScoreBg} style:color={s.home > s.guest ? match.overlayText : hexWithAlpha(match.overlayText, 0.5)}>{s.home}</div>
					{/each}
				</div>
				<div class="points" style:background-color={match.homeJerseyColor} style:color={match.overlayText}>{match.homePoints}</div>
				<div class="timeout-boxes" style:--jersey-color={match.homeJerseyColor}>
					<div class="timeout-box" class:taken={homeTimeoutsUsed >= 2} style:background-color={homeTimeoutsUsed < 2 ? match.homeJerseyColor : undefined}></div>
					<div class="timeout-box" class:taken={homeTimeoutsUsed >= 1} style:background-color={homeTimeoutsUsed < 1 ? match.homeJerseyColor : undefined}></div>
				</div>
				{#if timeoutTeam === 'home'}
					<div class="timeout">TIME OUT</div>
				{/if}
			</div>

			<!-- Guest Team Row -->
			<div class="team-row guest-row">
				{#if match.showJerseyColors}
					<div class="jersey" style:background-color={match.guestJerseyColor}></div>
				{/if}
				<div class="team-name" style:background={overlayBgStyle(match)} style:color={match.overlayText}>
					<span>{match.guestTeamName.toUpperCase()}</span>
					<img src="/vbcthun-ball.svg" alt="Service" class="service-icon" class:service-hidden={match.serviceTeam !== 'guest'} />
				</div>
				<div class="sets" style:background-color={match.overlaySatsBg} style:color={match.overlayText}>{match.guestSets}</div>
				<div class="set-scores-container" class:expanded={setScoresExpanded}>
					{#each match.setScores as s}
						<div class="set-score-cell" class:set-score-winner={s.guest > s.home} style:--winner-color={match.guestJerseyColor} style:background-color={match.overlaySetScoreBg} style:color={s.guest > s.home ? match.overlayText : hexWithAlpha(match.overlayText, 0.5)}>{s.guest}</div>
					{/each}
				</div>
				<div class="points" style:background-color={match.guestJerseyColor} style:color={match.overlayText}>{match.guestPoints}</div>
				<div class="timeout-boxes" style:--jersey-color={match.guestJerseyColor}>
					<div class="timeout-box" class:taken={guestTimeoutsUsed >= 2} style:background-color={guestTimeoutsUsed < 2 ? match.guestJerseyColor : undefined}></div>
					<div class="timeout-box" class:taken={guestTimeoutsUsed >= 1} style:background-color={guestTimeoutsUsed < 1 ? match.guestJerseyColor : undefined}></div>
				</div>
				{#if timeoutTeam === 'guest'}
					<div class="timeout">TIME OUT</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		top: 30px;
		left: 30px;
		font-family: 'Montserrat', 'Arial', sans-serif;
		z-index: 9999;
	}

	.scoreboard {
		display: grid;
		grid-template-rows: 64px 64px;
		row-gap: 3px;
	}

	.scoreboard.with-jersey {
		grid-template-columns: 10px minmax(260px, auto) 64px auto 72px auto auto;
	}

	.scoreboard:not(.with-jersey) {
		grid-template-columns: minmax(260px, auto) 64px auto 72px auto auto;
	}

	.team-row {
		display: grid;
		grid-template-columns: subgrid;
		grid-column: 1 / -1;
		align-items: stretch;
	}

	.jersey { flex-shrink: 0; }

	.team-name {
		padding: 0 24px;
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 28px;
		font-weight: 800;
		letter-spacing: 0.5px;
	}

	.service-icon { width: 28px; height: 28px; opacity: 0.85; margin-left: auto; }
	.service-icon.service-hidden { visibility: hidden; }

	.sets {
		color: var(--overlay-text, white);
		width: 64px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 32px;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		border-left: 2px solid var(--overlay-border);
	}

	.points {
		color: var(--overlay-text, white);
		width: 72px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 36px;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		transition: all 0.2s ease;
	}

	.set-score-cell {
		width: 56px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 28px;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		border-left: 1px solid var(--overlay-border);
		border-bottom: 3px solid transparent;
	}

	.set-score-winner { border-bottom-color: var(--winner-color); color: var(--overlay-text, white); }

	.scoreboard.rounded:not(.with-jersey) .home-row .team-name { border-radius: 8px 0 0 0; }
	.scoreboard.rounded.with-jersey .home-row .jersey { border-radius: 8px 0 0 0; }
	.scoreboard.rounded .home-row .timeout-boxes { border-radius: 0 8px 0 0; }
	.scoreboard.rounded:not(.with-jersey) .guest-row .team-name { border-radius: 0 0 0 8px; }
	.scoreboard.rounded.with-jersey .guest-row .jersey { border-radius: 0 0 0 8px; }
	.scoreboard.rounded .guest-row .timeout-boxes { border-radius: 0 0 8px 0; }
	.scoreboard.rounded .timeout { border-radius: 3px; }

	.set-scores-container {
		display: flex;
		align-items: stretch;
		max-width: 0;
		overflow: hidden;
		opacity: 0;
		transition: max-width 0.4s ease, opacity 0.3s ease;
	}

	.set-scores-container.expanded { max-width: 500px; opacity: 1; }

	.timeout-boxes { display: flex; flex-direction: column; gap: 0; justify-content: center; border-left: 1px solid var(--overlay-text, white); overflow: hidden; }
	.timeout-box { width: 10px; height: 50%; }
	.timeout-box:first-child { border-bottom: 1px solid var(--overlay-text, white); }
	.scoreboard.rounded .home-row .timeout-box:first-child { border-radius: 0 4px 0 0; }
	.scoreboard.rounded .home-row .timeout-box:last-child { border-radius: 0 0 0 0; }
	.scoreboard.rounded .guest-row .timeout-box:first-child { border-radius: 0 0 0 0; }
	.scoreboard.rounded .guest-row .timeout-box:last-child { border-radius: 0 0 4px 0; }
	.timeout-box.taken { background: transparent; border: 1px solid var(--jersey-color); border-left: none; }

	.timeout {
		margin-left: 3px;
		background: rgba(234, 179, 8, 0.95);
		color: black;
		padding: 0 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 400;
		font-size: 28px;
		letter-spacing: 1px;
		white-space: nowrap;
		animation: fadeIn 0.3s ease;
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: translateX(-10px); }
		to { opacity: 1; transform: translateX(0); }
	}
</style>
