<!--
	Drawer score bug: no logo while the ball is in play. Set point, match point and timeout sit
	inline at the end of the team's own row and slide out from behind the points (330 ms snap,
	back in 132 ms). Only when the game pauses (timeout, set break, final) does the paper Scorely
	drawer slide out below the bug. The stream capture runs at about 5 to 15 fps and software
	mode forces `animation: none`, so every transition only moves toward its static end state.
-->
<script lang="ts">
	import type { MatchState, Team } from '$lib/types.js';
	import type { ScoreboardOptions } from './index.js';
	import Logo from '$lib/components/brand/Logo.svelte';
	import { ALERT_LABEL, isPause, isSetBreak, teamAlert } from './state.js';
	import { slideOut } from './transitions.js';
	import { timeoutClock } from './timeout-clock.svelte.js';

	interface Props {
		match: MatchState;
		homeTimeoutsUsed: number;
		guestTimeoutsUsed: number;
		timeoutTeam: Team | null;
		options?: ScoreboardOptions;
	}

	let { match, timeoutTeam }: Props = $props();

	const alert = $derived(teamAlert(match, timeoutTeam));
	const pause = $derived(isPause(match, timeoutTeam));
	const showHistory = $derived(match.status === 'finished' || isSetBreak(match));
	const clock = timeoutClock(() => timeoutTeam);

	function teamName(team: Team): string {
		return team === 'home' ? match.homeTeamName : match.guestTeamName;
	}
</script>

{#snippet teamRow(team: Team)}
	{@const home = team === 'home'}
	{@const points = home ? match.homePoints : match.guestPoints}
	<div class="row" class:guest={!home}>
		<div class="name-cell">
			<span class="serve" class:on={match.serviceTeam === team} aria-hidden="true"></span>
			<span class="name">{teamName(team).toUpperCase()}</span>
			{#if showHistory && match.setScores.length > 0}
				<span class="history">
					{#each match.setScores as s, i (i)}
						{@const own = home ? s.home : s.guest}
						{@const other = home ? s.guest : s.home}
						<span class:lost={own < other}>{own}</span>
					{/each}
				</span>
			{/if}
		</div>
		<div class="sets">{home ? match.homeSets : match.guestSets}</div>
		<div class="points">
			{#key points}
				<span class="digits">{points}</span>
			{/key}
		</div>
		<div class="alert-slot">
			{#if alert?.team === team}
				{#key alert.kind}
					<div
						class="alert kind-{alert.kind}"
						in:slideOut={{ duration: 330, axis: 'x' }}
						out:slideOut={{ duration: 132, axis: 'x' }}
					>
						<span>{ALERT_LABEL[alert.kind]}</span>
						{#if alert.kind === 'timeout'}
							<span class="clock">{clock.label}</span>
						{/if}
					</div>
				{/key}
			{/if}
		</div>
	</div>
{/snippet}

<div
	class="bug"
	aria-label="{match.homeTeamName} {match.homePoints} : {match.guestPoints} {match.guestTeamName}"
>
	{@render teamRow('home')}
	{@render teamRow('guest')}
	<div class="drawer-slot">
		{#if pause}
			<div
				class="drawer"
				in:slideOut={{ duration: 420, delay: timeoutTeam ? 330 : 0, axis: 'y' }}
				out:slideOut={{ duration: 132, axis: 'y' }}
			>
				<Logo variant="lockup" class="drawer-logo" />
				<span class="drawer-note">LIVE AUF SCORELY.CH</span>
			</div>
		{/if}
	</div>
</div>

<style>
	.bug {
		display: inline-grid;
		grid-template-columns: auto 40px 76px auto;
		font-family: var(--font-sans);
		color: var(--paper, #f5f3ee);
	}

	.row {
		display: contents;
	}
	.row > :not(.alert-slot) {
		height: 56px;
	}
	.row.guest > .name-cell {
		box-shadow: inset 0 1px 0 var(--grey-700, #2a2a2a);
	}

	.name-cell {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 0 22px 0 14px;
		background: var(--ink, #0a0a0a);
		white-space: nowrap;
	}

	.serve {
		flex: 0 0 10px;
		height: 10px;
		border-radius: 50%;
	}
	.serve.on {
		background: var(--pulse, #ff3d2e);
	}

	.name {
		font-weight: var(--type-wght-display, 780);
		font-size: 18px;
		letter-spacing: 0.01em;
		line-height: 1;
	}

	.history {
		display: flex;
		gap: 10px;
		margin-left: auto;
		padding-left: 18px;
		font-family: var(--font-mono);
		font-variant-numeric: tabular-nums;
		font-size: 15px;
		color: var(--grey-300, #c8c5bd);
	}
	.history .lost {
		color: var(--grey-500, #6b6b6b);
	}

	.sets,
	.points {
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-mono);
		font-variant-numeric: tabular-nums;
		font-weight: 700;
	}
	.sets {
		font-size: 20px;
		background: var(--grey-700, #2a2a2a);
	}
	.points {
		font-size: 34px;
		background: var(--grey-850, #161616);
		overflow: hidden;
	}

	/* Point update: 330 ms snap roll, no squash, no flash */
	.digits {
		display: block;
		animation: roll calc(330ms * var(--motion-scale, 1)) var(--ease-snap, cubic-bezier(0.2, 0.9, 0.1, 1));
	}
	@keyframes roll {
		from {
			transform: translateY(60%);
		}
		to {
			transform: translateY(0);
		}
	}

	.alert-slot {
		display: flex;
		overflow: hidden;
	}

	.alert {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 0 18px;
		font-weight: var(--type-wght-display, 780);
		font-size: 14px;
		letter-spacing: 0.1em;
		white-space: nowrap;
	}
	.clock {
		font-family: var(--font-mono);
		font-variant-numeric: tabular-nums;
		font-weight: 700;
		font-size: 22px;
		letter-spacing: 0;
	}
	.kind-set {
		background: var(--cool, #1d4ed8);
		color: var(--paper, #f5f3ee);
	}
	.kind-match {
		background: var(--pulse, #ff3d2e);
		color: var(--ink, #0a0a0a);
	}
	.kind-timeout {
		background: var(--color-warning, #eab308);
		color: var(--ink, #0a0a0a);
	}

	.drawer-slot {
		grid-column: 1 / 4;
		overflow: hidden;
	}

	.drawer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		height: 52px;
		padding: 0 16px;
		background: var(--paper, #f5f3ee);
		color: var(--ink, #0a0a0a);
		border-radius: 0 0 20px 0;
	}
	.drawer :global(.drawer-logo) {
		height: 26px;
	}
	.drawer-note {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.12em;
		color: var(--grey-500, #6b6b6b);
	}

	@media (max-width: 480px) {
		.row > :not(.alert-slot) {
			height: 46px;
		}
		.name-cell {
			padding: 0 12px 0 10px;
			gap: 6px;
		}
		.name {
			font-size: 14px;
		}
		.bug {
			grid-template-columns: auto 30px 56px auto;
		}
		.sets {
			font-size: 16px;
		}
		.points {
			font-size: 28px;
		}
		.alert {
			padding: 0 12px;
			font-size: 12px;
		}
	}
</style>
