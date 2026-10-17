<!--
	The Scorely score bug (brand manual p26). Native size 436 x 128 at 1080p: paper mark cell,
	two 64 px team rows, sets won on grey-700, points on grey-850. Banners (set point, match
	point, timeout) slide out from under the bug in 330 ms snap and back in 132 ms, never blink.
	The stream capture runs at about 5 to 15 fps and software mode forces `animation: none`, so
	every state must read without motion: transitions only ever move toward the static end state.
-->
<script lang="ts">
	import type { MatchState, Team } from '$lib/types.js';
	import type { ScoreboardOptions } from './index.js';
	import type { TransitionConfig } from 'svelte/transition';
	import Logo from '$lib/components/brand/Logo.svelte';
	import { ease } from '$lib/brand/reveal.js';

	interface Props {
		match: MatchState;
		homeTimeoutsUsed: number;
		guestTimeoutsUsed: number;
		timeoutTeam: Team | null;
		options?: ScoreboardOptions;
	}

	let { match, timeoutTeam, options = {} }: Props = $props();

	const TIMEOUT_SECONDS = 30;

	const light = $derived(options.theme === 'light');
	const accentWarm = $derived((options.accentWarm as string) ?? '#ff3d2e');
	const accentCool = $derived((options.accentCool as string) ?? '#1d4ed8');
	const showLogos = $derived(options.showLogos === true);

	function isAtSetPoint(pts: number, other: number, setNum: number): boolean {
		const target = setNum === 5 ? 15 : 25;
		return pts >= target - 1 && pts > other;
	}

	const homeSetPoint = $derived(match.status === 'live' && isAtSetPoint(match.homePoints, match.guestPoints, match.currentSet));
	const guestSetPoint = $derived(match.status === 'live' && isAtSetPoint(match.guestPoints, match.homePoints, match.currentSet));

	type BannerKind = 'timeout' | 'match' | 'set';
	interface Banner {
		kind: BannerKind;
		label: string;
		team: string;
	}

	function teamName(team: Team): string {
		return team === 'home' ? match.homeTeamName : match.guestTeamName;
	}

	const banner = $derived.by((): Banner | null => {
		if (timeoutTeam) return { kind: 'timeout', label: 'TIMEOUT', team: teamName(timeoutTeam) };
		const pointTeam: Team | null = homeSetPoint ? 'home' : guestSetPoint ? 'guest' : null;
		if (!pointTeam) return null;
		const sets = pointTeam === 'home' ? match.homeSets : match.guestSets;
		const isMatchPoint = sets === 2;
		return isMatchPoint
			? { kind: 'match', label: 'MATCH POINT', team: teamName(pointTeam) }
			: { kind: 'set', label: 'SET POINT', team: teamName(pointTeam) };
	});

	let timeoutLeft = $state(TIMEOUT_SECONDS);
	$effect(() => {
		if (!timeoutTeam) return;
		timeoutLeft = TIMEOUT_SECONDS;
		const started = Date.now();
		const id = setInterval(() => {
			timeoutLeft = Math.max(0, TIMEOUT_SECONDS - Math.floor((Date.now() - started) / 1000));
		}, 250);
		return () => clearInterval(id);
	});

	const timeoutLabel = $derived(`0:${timeoutLeft.toString().padStart(2, '0')}`);

	function motionScale(): number {
		const n = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--motion-scale'));
		return Number.isFinite(n) ? n : 1;
	}

	/** Slide out from under the bug: the banner travels its own height from behind the bug. */
	function underBug(_node: Element, { duration }: { duration: number }): TransitionConfig {
		return {
			duration: duration * motionScale(),
			easing: (t) => ease('snap', t),
			css: (t) => `transform: translateY(${(t - 1) * 100}%)`
		};
	}
</script>

{#snippet teamRow(team: Team)}
	{@const home = team === 'home'}
	{@const serving = match.serviceTeam === team}
	{@const points = home ? match.homePoints : match.guestPoints}
	{@const logoUrl = home ? match.homeTeamLogo : match.guestTeamLogo}
	<div class="row">
		<div class="name-cell">
			<span class="serve" class:on={serving} aria-hidden="true"></span>
			{#if showLogos && logoUrl}
				<img class="team-logo" src="/api/image-proxy?url={encodeURIComponent(logoUrl)}" alt="" />
			{/if}
			<span class="name">{teamName(team).toUpperCase()}</span>
		</div>
		{#if match.setScores.length > 0}
			<div class="history">
				{#each match.setScores as s, i (i)}
					{@const own = home ? s.home : s.guest}
					{@const other = home ? s.guest : s.home}
					<span class="set" class:lost={own < other}>{own}</span>
				{/each}
			</div>
		{/if}
		<div class="sets">{home ? match.homeSets : match.guestSets}</div>
		<div class="points">
			{#key points}
				<span class="digits">{points}</span>
			{/key}
		</div>
	</div>
{/snippet}

<div
	class="bug"
	class:light
	style:--bug-warm={accentWarm}
	style:--bug-cool={accentCool}
	aria-label="{match.homeTeamName} {match.homePoints} : {match.guestPoints} {match.guestTeamName}"
>
	<div class="board">
		<div class="mark-cell">
			<Logo variant="mark" class="bug-mark" />
		</div>
		<div class="rows">
			{@render teamRow('home')}
			{@render teamRow('guest')}
		</div>
	</div>
	<div class="banner-slot">
		{#if banner}
			{#key banner.kind + banner.team}
				<div
					class="banner kind-{banner.kind}"
					in:underBug={{ duration: 330 }}
					out:underBug={{ duration: 132 }}
				>
					<span class="banner-label">{banner.label}</span>
					<span class="banner-team">{banner.team.toUpperCase()}</span>
					{#if banner.kind === 'timeout'}
						<span class="banner-clock">{timeoutLabel}</span>
					{/if}
				</div>
			{/key}
		{/if}
	</div>
</div>

<style>
	.bug {
		--bug-surface: var(--ink, #0a0a0a);
		--bug-text: var(--paper, #f5f3ee);
		--bug-dim: var(--grey-500, #6b6b6b);
		--bug-line: var(--grey-700, #2a2a2a);
		--bug-sets: var(--grey-700, #2a2a2a);
		--bug-points: var(--grey-850, #161616);
		--bug-mark-cell: var(--paper, #f5f3ee);
		--bug-mark: var(--ink, #0a0a0a);
		display: inline-grid;
		min-width: 436px;
		font-family: var(--font-sans);
		color: var(--bug-text);
	}
	.bug.light {
		--bug-surface: var(--paper, #f5f3ee);
		--bug-text: var(--ink, #0a0a0a);
		--bug-line: var(--grey-300, #c8c5bd);
		--bug-sets: var(--grey-300, #c8c5bd);
		--bug-points: var(--grey-100, #ebe8e1);
		--bug-mark-cell: var(--ink, #0a0a0a);
		--bug-mark: var(--paper, #f5f3ee);
	}

	.board {
		position: relative;
		z-index: 1;
		display: flex;
		height: 128px;
		background: var(--bug-surface);
	}

	.mark-cell {
		flex: 0 0 64px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bug-mark-cell);
		color: var(--bug-mark);
	}
	.mark-cell :global(.bug-mark) {
		width: 44px;
		height: 44px;
	}

	.rows {
		flex: 1;
		display: grid;
		grid-template-rows: 64px 64px;
	}

	.row {
		display: flex;
		align-items: stretch;
	}
	.row + .row {
		box-shadow: inset 0 1px 0 var(--bug-line);
	}

	.name-cell {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 16px 0 14px;
		min-width: 0;
	}

	.serve {
		flex: 0 0 10px;
		height: 10px;
		border-radius: 50%;
	}
	.serve.on {
		background: var(--bug-warm);
	}

	.team-logo {
		width: 28px;
		height: 28px;
		object-fit: contain;
	}

	.name {
		font-weight: var(--type-wght-display, 780);
		font-size: 18px;
		letter-spacing: 0.01em;
		line-height: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.history {
		display: flex;
		align-items: center;
		gap: 12px;
		padding-right: 14px;
		font-family: var(--font-mono);
		font-variant-numeric: tabular-nums;
		font-size: 15px;
	}
	.set {
		min-width: 2ch;
		text-align: right;
	}
	.set.lost {
		color: var(--bug-dim);
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
		font-size: 20px;
		background: var(--bug-sets);
	}
	.points {
		flex: 0 0 80px;
		font-size: 36px;
		background: var(--bug-points);
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

	.banner-slot {
		position: relative;
		overflow: hidden;
		height: 36px;
	}

	.banner {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 0 16px;
		font-weight: var(--type-wght-display, 780);
		font-size: 15px;
		letter-spacing: 0.1em;
		white-space: nowrap;
	}
	.banner-team {
		font-weight: var(--type-wght-bold, 680);
	}
	.banner-clock {
		margin-left: auto;
		font-family: var(--font-mono);
		font-variant-numeric: tabular-nums;
		font-weight: 700;
		font-size: 18px;
		letter-spacing: 0;
	}
	.kind-set {
		background: var(--bug-cool);
		color: var(--paper, #f5f3ee);
	}
	.kind-match {
		background: var(--bug-warm);
		color: var(--ink, #0a0a0a);
	}
	.kind-timeout {
		background: var(--color-warning, #eab308);
		color: var(--ink, #0a0a0a);
	}

	@media (max-width: 480px) {
		.bug {
			min-width: 0;
		}
		.history {
			display: none;
		}
	}
</style>
