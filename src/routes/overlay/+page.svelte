<script lang="ts">
	import { onMount } from 'svelte';
	import type { MatchState, SSEEvent } from '$lib/types.js';

	let { data } = $props();
	let match = $state<MatchState | null>(null);

	$effect(() => {
		if (data.match) match = data.match;
	});
	let timeoutTeam = $state<string | null>(null);
	let timeoutTimer = $state<ReturnType<typeof setTimeout> | null>(null);
	let scoreChanged = $state(false);

	function startTimeout(team: string) {
		if (timeoutTimer) clearTimeout(timeoutTimer);
		timeoutTeam = team;
		timeoutTimer = setTimeout(() => {
			timeoutTeam = null;
			timeoutTimer = null;
		}, 30000);
	}

	onMount(() => {
		const es = new EventSource('/api/scores/stream');

		es.onmessage = (event) => {
			const parsed: SSEEvent = JSON.parse(event.data);

			if (parsed.type === 'score' || parsed.type === 'match') {
				match = parsed.data;
				scoreChanged = true;
				setTimeout(() => (scoreChanged = false), 500);
			}

			if (parsed.type === 'timeout') {
				startTimeout(parsed.data.team);
			}
		};

		return () => {
			es.close();
			if (timeoutTimer) clearTimeout(timeoutTimer);
		};
	});
</script>

<svelte:head>
	<title>Overlay</title>
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
		<div class="scoreboard" class:flash={scoreChanged}>
			<!-- Home Team Row -->
			<div class="team-row home-row">
				{#if match.showJerseyColors}
					<div class="jersey" style:background-color={match.homeJerseyColor}></div>
				{/if}
				<div class="team-name">
					{#if match.serviceTeam === 'home'}
						<img src="/vbcthun-ball.svg" alt="Service" class="service-icon" />
					{/if}
					<span>{match.homeTeamName.toUpperCase()}</span>
				</div>
				<div class="sets">{match.homeSets}</div>
				{#if match.showSetScores}
					{#each match.setScores as s}
						<div class="set-score-cell">{s.home}</div>
					{/each}
					<div class="set-score-cell set-score-current">{match.homePoints}</div>
				{:else}
					<div class="points" style:background-color={match.homeJerseyColor}>
						{match.homePoints}
					</div>
				{/if}
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
					{#if match.serviceTeam === 'guest'}
						<img src="/vbcthun-ball.svg" alt="Service" class="service-icon" />
					{/if}
					<span>{match.guestTeamName.toUpperCase()}</span>
				</div>
				<div class="sets">{match.guestSets}</div>
				{#if match.showSetScores}
					{#each match.setScores as s}
						<div class="set-score-cell">{s.guest}</div>
					{/each}
					<div class="set-score-cell set-score-current">{match.guestPoints}</div>
				{:else}
					<div class="points" style:background-color={match.guestJerseyColor}>
						{match.guestPoints}
					</div>
				{/if}
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
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.scoreboard.flash {
		animation: pulse 0.3s ease;
	}

	@keyframes pulse {
		50% { transform: scale(1.02); }
	}

	.team-row {
		display: flex;
		align-items: stretch;
		height: 64px;
	}

	.home-row .team-name {
		background: #0a0a0a;
	}

	.guest-row .team-name {
		background: #1a1a1a;
	}

	.jersey {
		width: 10px;
		flex-shrink: 0;
	}

	.team-name {
		color: white;
		padding: 0 24px;
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 260px;
		font-size: 28px;
		font-weight: 800;
		letter-spacing: 0.5px;
	}

	.service-icon {
		width: 28px;
		height: 28px;
		opacity: 0.85;
	}

	.sets {
		background: #1a1a1a;
		color: white;
		width: 64px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 32px;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		border-left: 2px solid #2a2a2a;
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
		background: #1a1a1a;
		color: #94a3b8;
		width: 56px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 28px;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		border-left: 1px solid #2a2a2a;
	}

	.set-score-current {
		color: white;
		background: #0c1929;
		border: 2px solid #38bdf8;
	}

	.timeout {
		margin-left: 3px;
		background: rgba(234, 179, 8, 0.95);
		color: black;
		padding: 0 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 800;
		font-size: 14px;
		letter-spacing: 1px;
		white-space: nowrap;
		animation: fadeIn 0.3s ease;
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: translateX(-10px); }
		to { opacity: 1; transform: translateX(0); }
	}
</style>
