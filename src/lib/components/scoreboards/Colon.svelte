<!--
	Colon score strip: home and guest mirror each other around the score colon (brand secondary
	mark), no logo while the ball is in play. Set point, match point and timeout hang under the
	half of the team they belong to. When the game pauses, the colon turns into the mark below the
	strip ("colon to logo", brand README 9.3): the balls slide apart to the edge in 420 ms snap,
	then the block ripples out of the two contact points in 900 ms glide. The stream capture runs
	at about 5 to 15 fps and software mode forces `animation: none`, so the SVG attributes hold
	the end state and every animation only runs toward it.
-->
<script lang="ts">
	import type { MatchState, Team } from '$lib/types.js';
	import type { ScoreboardOptions } from './index.js';
	import { BLOCK, BALLS } from '$lib/brand/paths.js';
	import { ALERT_LABEL, isPause, teamAlert } from './state.js';
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

	const uid = $props.id();
	const alert = $derived(teamAlert(match, timeoutTeam));
	const pause = $derived(isPause(match, timeoutTeam));
	const clock = timeoutClock(() => timeoutTeam);
</script>

{#snippet wing(team: Team)}
	<div class="wing-slot {team}">
		{#if alert?.team === team}
			{#key alert.kind}
				<div
					class="wing kind-{alert.kind}"
					in:slideOut={{ duration: 330, axis: 'y' }}
					out:slideOut={{ duration: 132, axis: 'y' }}
				>
					<span>{ALERT_LABEL[alert.kind]}</span>
					{#if alert.kind === 'timeout'}
						<span class="clock">{clock.label}</span>
					{/if}
				</div>
			{/key}
		{/if}
	</div>
{/snippet}

<div
	class="strip"
	aria-label="{match.homeTeamName} {match.homePoints} : {match.guestPoints} {match.guestTeamName}"
>
	<div class="half home">
		<span class="name-cell">
			<span class="serve" class:on={match.serviceTeam === 'home'} aria-hidden="true"></span>
			<span class="name">{match.homeTeamName.toUpperCase()}</span>
		</span>
		<span class="sets">{match.homeSets}</span>
		<span class="points">
			{#key match.homePoints}<span class="digits">{match.homePoints}</span>{/key}
		</span>
	</div>
	<div class="colon" aria-hidden="true">
		{#if !pause}
			<span class="dot"></span>
			<span class="dot"></span>
		{/if}
	</div>
	<div class="half guest">
		<span class="points">
			{#key match.guestPoints}<span class="digits">{match.guestPoints}</span>{/key}
		</span>
		<span class="sets">{match.guestSets}</span>
		<span class="name-cell">
			<span class="name">{match.guestTeamName.toUpperCase()}</span>
			<span class="serve" class:on={match.serviceTeam === 'guest'} aria-hidden="true"></span>
		</span>
	</div>

	{@render wing('home')}
	<div class="logo-slot">
		{#if pause}
			<div
				class="logo-cell"
				in:slideOut={{ duration: 330, axis: 'y' }}
				out:slideOut={{ duration: 132, axis: 'y' }}
			>
				<svg viewBox="0 0 200 200" class="mark" role="img" aria-label="Scorely">
					<defs>
						<clipPath id="ripple-{uid}">
							<circle class="ripple" cx="176.6" cy="69" r="196" />
							<circle class="ripple" cx="23.4" cy="131" r="196" />
						</clipPath>
					</defs>
					<path d={BLOCK} fill="var(--ink, #0a0a0a)" clip-path="url(#ripple-{uid})" />
					{#each BALLS as b (b.cx)}
						<circle class="ball" cx={b.cx} cy={b.cy} r={b.r} fill="var(--pulse, #ff3d2e)" />
					{/each}
				</svg>
			</div>
		{/if}
	</div>
	{@render wing('guest')}
</div>

<style>
	.strip {
		display: inline-grid;
		grid-template-columns: minmax(max-content, 1fr) 64px minmax(max-content, 1fr);
		grid-template-rows: 56px auto;
		font-family: var(--font-sans);
		color: var(--paper, #f5f3ee);
	}

	.half {
		display: flex;
		align-items: stretch;
		background: var(--ink, #0a0a0a);
	}
	.half.home {
		justify-content: flex-end;
	}

	.name-cell {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 0 18px;
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
		flex: 0 0 36px;
		font-size: 18px;
		background: var(--grey-700, #2a2a2a);
	}
	.points {
		flex: 0 0 66px;
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
	}

	/* Colon: height 2/3 of the digit cap height, one dot diameter between the balls */
	.colon {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 7px;
		background: var(--grey-850, #161616);
	}
	.dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--pulse, #ff3d2e);
	}

	.wing-slot,
	.logo-slot {
		display: flex;
		overflow: hidden;
	}
	.wing-slot.home {
		justify-content: flex-end;
	}

	.wing {
		display: flex;
		align-items: center;
		gap: 12px;
		height: 52px;
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

	.logo-cell {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 64px;
		height: 52px;
		background: var(--paper, #f5f3ee);
	}
	.mark {
		width: 38px;
		height: 38px;
	}

	/* Colon to logo: balls start stacked at x 100 (the colon) and slide to the edge */
	.ball {
		animation: ball-slide calc(420ms * var(--motion-scale, 1)) var(--ease-snap, cubic-bezier(0.2, 0.9, 0.1, 1))
			calc(330ms * var(--motion-scale, 1)) backwards;
	}
	@keyframes ball-slide {
		from {
			cx: 100px;
		}
	}
	.ripple {
		animation: ripple calc(900ms * var(--motion-scale, 1)) var(--ease-glide, cubic-bezier(0.25, 1, 0.3, 1))
			calc(750ms * var(--motion-scale, 1)) backwards;
	}
	@keyframes ripple {
		from {
			r: 0px;
		}
	}

	@media (max-width: 480px) {
		.strip {
			grid-template-rows: 46px auto;
			grid-template-columns: minmax(max-content, 1fr) 48px minmax(max-content, 1fr);
		}
		.name-cell {
			padding: 0 10px;
			gap: 6px;
		}
		.name {
			font-size: 14px;
		}
		.sets {
			flex-basis: 28px;
			font-size: 15px;
		}
		.points {
			flex-basis: 50px;
			font-size: 28px;
		}
		.wing {
			height: 40px;
			padding: 0 12px;
			font-size: 12px;
		}
		.logo-cell {
			width: 48px;
			height: 40px;
		}
		.mark {
			width: 28px;
			height: 28px;
		}
	}
</style>
