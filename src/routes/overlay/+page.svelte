<script lang="ts">
	import { onMount } from 'svelte';
	import type { MatchState, SSEEvent } from '$lib/types.js';

	let { data } = $props();
	let match = $state<MatchState | null>(null);

	$effect(() => {
		if (data.match) match = data.match;
	});
	let timeoutActive = $state<string | null>(null);
	let scoreChanged = $state(false);

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
				timeoutActive = parsed.data.team;
				setTimeout(() => (timeoutActive = null), 5000);
			}
		};

		return () => es.close();
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
						<img src="/volleyball.svg" alt="Service" class="service-icon" />
					{/if}
					<span>{match.homeTeamName.toUpperCase()}</span>
				</div>
				<div class="sets">{match.homeSets}</div>
				<div class="points" style:background-color={match.homeJerseyColor}>
					{match.homePoints}
				</div>
			</div>

			<!-- Guest Team Row -->
			<div class="team-row guest-row">
				{#if match.showJerseyColors}
					<div class="jersey" style:background-color={match.guestJerseyColor}></div>
				{/if}
				<div class="team-name">
					{#if match.serviceTeam === 'guest'}
						<img src="/volleyball.svg" alt="Service" class="service-icon" />
					{/if}
					<span>{match.guestTeamName.toUpperCase()}</span>
				</div>
				<div class="sets">{match.guestSets}</div>
				<div class="points" style:background-color={match.guestJerseyColor}>
					{match.guestPoints}
				</div>
			</div>
		</div>

		{#if timeoutActive}
			<div class="timeout">
				TIME OUT — {timeoutActive === 'home' ? match.homeTeamName : match.guestTeamName}
			</div>
		{/if}
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		top: 30px;
		left: 30px;
		font-family: 'Arial', 'Helvetica Neue', sans-serif;
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
		opacity: 0.7;
		filter: invert(1);
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

	.timeout {
		margin-top: 8px;
		background: rgba(234, 179, 8, 0.95);
		color: black;
		padding: 10px 24px;
		font-weight: 800;
		font-size: 20px;
		text-align: center;
		animation: fadeIn 0.3s ease;
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(-10px); }
		to { opacity: 1; transform: translateY(0); }
	}
</style>
