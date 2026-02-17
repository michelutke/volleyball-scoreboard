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
		<div class="scoreboard" class:with-jersey={match.showJerseyColors}>
			<!-- Home Team Row -->
			<div class="team-row home-row">
				{#if match.showJerseyColors}
					<div class="jersey" style:background-color={match.homeJerseyColor}></div>
				{/if}
				<div class="team-name">
					<span>{match.homeTeamName.toUpperCase()}</span>
					<img src="/vbcthun-ball.svg" alt="Service" class="service-icon" class:service-hidden={match.serviceTeam !== 'home'} />
				</div>
				<div class="sets">{match.homeSets}</div>
				<div class="set-scores-container" class:expanded={setScoresExpanded}>
					{#each match.setScores as s}
						<div class="set-score-cell" class:set-score-winner={s.home > s.guest} style:--winner-color={match.homeJerseyColor}>{s.home}</div>
					{/each}
				</div>
				<div class="points" style:background-color={match.homeJerseyColor}>{match.homePoints}</div>
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
				<div class="team-name">
					<span>{match.guestTeamName.toUpperCase()}</span>
					<img src="/vbcthun-ball.svg" alt="Service" class="service-icon" class:service-hidden={match.serviceTeam !== 'guest'} />
				</div>
				<div class="sets">{match.guestSets}</div>
				<div class="set-scores-container" class:expanded={setScoresExpanded}>
					{#each match.setScores as s}
						<div class="set-score-cell" class:set-score-winner={s.guest > s.home} style:--winner-color={match.guestJerseyColor}>{s.guest}</div>
					{/each}
				</div>
				<div class="points" style:background-color={match.guestJerseyColor}>{match.guestPoints}</div>
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

	.home-row .team-name { background: var(--color-overlay-bg-dark); }
	.guest-row .team-name { background: var(--color-overlay-bg); }
	.jersey { flex-shrink: 0; }

	.team-name {
		color: white;
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
		background: var(--color-overlay-bg);
		color: white;
		width: 64px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 32px;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		border-left: 2px solid var(--color-overlay-border);
	}

	.points {
		color: white;
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
		background: var(--color-overlay-bg);
		color: var(--color-text-secondary);
		width: 56px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 28px;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		border-left: 1px solid var(--color-overlay-border);
		border-bottom: 3px solid transparent;
	}

	.set-score-winner { border-bottom-color: var(--winner-color); color: var(--color-text-primary); }

	.set-scores-container {
		display: flex;
		align-items: stretch;
		max-width: 0;
		overflow: hidden;
		opacity: 0;
		transition: max-width 0.4s ease, opacity 0.3s ease;
	}

	.set-scores-container.expanded { max-width: 500px; opacity: 1; }

	.timeout-boxes { display: flex; flex-direction: column; gap: 2px; justify-content: center; padding: 4px 0; }
	.timeout-box { width: 10px; height: 26px; }
	.timeout-box.taken { background: transparent; border: 1px solid var(--jersey-color); }

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
