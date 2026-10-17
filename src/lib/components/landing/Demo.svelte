<script lang="ts">
	import { addPoint, removePoint } from '$lib/volleyball.js';
	import type { MatchState, Team } from '$lib/types.js';
	import ScoreboardDisplay from '$lib/components/ScoreboardDisplay.svelte';
	import type { Lang } from '$lib/i18n/landing.js';
	import { t } from '$lib/i18n/landing.js';
	import { reveal } from '$lib/motion.js';

	interface Props {
		lang: Lang;
	}

	let { lang }: Props = $props();

	const INITIAL: MatchState = {
		matchId: 0,
		homeTeamName: 'VBC Thun',
		guestTeamName: 'Spiez',
		homeTeamLogo: null,
		guestTeamLogo: null,
		homePoints: 24,
		guestPoints: 22,
		homeSets: 1,
		guestSets: 1,
		currentSet: 3,
		setScores: [
			{ home: 25, guest: 21 },
			{ home: 23, guest: 25 }
		],
		serviceTeam: 'home',
		showSetScores: true,
		showJerseyColors: true,
		status: 'live',
		homeJerseyColor: 'var(--pulse)',
		guestJerseyColor: 'var(--cool)',
		overlayBg: 'var(--ink)',
		overlayBg2: 'var(--grey-900)',
		overlayBgGradient: false,
		overlayText: 'var(--paper)',
		overlayRounded: false,
		overlayDivider: 'var(--grey-700)',
		overlaySatsBg: 'var(--grey-700)',
		overlaySetScoreBg: 'var(--grey-850)',
		scoreColor: 'var(--paper)',
		scoreColor2: 'var(--paper)',
		scoreColorGradient: false,
		designTemplateId: null
	};

	let match = $state<MatchState>({ ...INITIAL });
	let homeTimeouts = $state(0);
	let guestTimeouts = $state(0);
	let timeoutTeam = $state<Team | null>(null);
	let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		return () => {
			if (timeoutTimer) clearTimeout(timeoutTimer);
		};
	});

	function doAddPoint(team: Team) {
		if (match.status === 'finished') return;
		const prevSet = match.currentSet;
		match = addPoint($state.snapshot(match), team);
		if (match.currentSet !== prevSet) {
			homeTimeouts = 0;
			guestTimeouts = 0;
			timeoutTeam = null;
			if (timeoutTimer) clearTimeout(timeoutTimer);
		}
	}

	function doRemovePoint(team: Team) {
		if (match.status === 'finished') return;
		match = removePoint($state.snapshot(match), team);
	}

	function doTimeout(team: Team) {
		const used = team === 'home' ? homeTimeouts : guestTimeouts;
		if (used >= 2) return;
		if (team === 'home') homeTimeouts++;
		else guestTimeouts++;
		timeoutTeam = team;
		if (timeoutTimer) clearTimeout(timeoutTimer);
		timeoutTimer = setTimeout(() => {
			timeoutTeam = null;
			timeoutTimer = null;
		}, 30000);
	}

	function doReset() {
		match = { ...INITIAL };
		homeTimeouts = 0;
		guestTimeouts = 0;
		timeoutTeam = null;
		if (timeoutTimer) clearTimeout(timeoutTimer);
	}

	const tr = $derived(t[lang].demo);
	const matchWon = $derived(match.status === 'finished');
	const winnerName = $derived(match.homeSets > match.guestSets ? match.homeTeamName : match.guestTeamName);
</script>

<div id="demo" class="demo">
	<p class="label k-mono">{tr.obsLabel}</p>

	<div class="panel">
		<div class="stage">
			<div class="bug-wrap">
				<ScoreboardDisplay
					{match}
					homeTimeoutsUsed={homeTimeouts}
					guestTimeoutsUsed={guestTimeouts}
					{timeoutTeam}
					layoutId="kinetic"
				/>
			</div>

			{#if !matchWon}
				<div class="side">
					{#each ['home', 'guest'] as const as team}
						<div class="side-cell">
							<button
								class="op op-minus"
								onclick={() => doRemovePoint(team)}
								disabled={(team === 'home' ? match.homePoints : match.guestPoints) === 0}
								aria-label={tr.undo}
							>−</button>
							<button class="op op-plus" onclick={() => doAddPoint(team)} aria-label="+">+</button>
							<span class="hint k-mono">{tr.point}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		{#if matchWon}
			<div class="winner" use:reveal>
				<p class="winner-title">{winnerName} {tr.matchWon}</p>
				<p class="winner-score k-mono k-tabular">
					{match.homeSets}{@render colon()}{match.guestSets}
				</p>
				<button class="reset-btn" onclick={doReset}>{tr.reset}</button>
			</div>
		{:else}
			<div class="foot">
				<p class="hint-line">{tr.hint}</p>
				<div class="tools">
					<button class="tool k-mono" class:on={timeoutTeam === 'home'} onclick={() => doTimeout('home')} disabled={homeTimeouts >= 2}>
						{tr.timeout} {match.homeTeamName} <span>{homeTimeouts}/2</span>
					</button>
					<button class="tool k-mono" class:on={timeoutTeam === 'guest'} onclick={() => doTimeout('guest')} disabled={guestTimeouts >= 2}>
						{tr.timeout} {match.guestTeamName} <span>{guestTimeouts}/2</span>
					</button>
					<button class="tool k-mono" onclick={doReset}>{tr.reset}</button>
				</div>
			</div>
		{/if}
	</div>

	<p class="label k-mono">{tr.svBadge}</p>
</div>

{#snippet colon()}
	<svg class="colon" viewBox="75.4 44.4 49.2 111.2" aria-hidden="true">
		<circle cx="100" cy="69" r="24.6" fill="var(--pulse)" />
		<circle cx="100" cy="131" r="24.6" fill="var(--pulse)" />
	</svg>
{/snippet}

<style>
	.demo {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 0;
	}

	.label {
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--k-text-dim);
		margin: 0;
	}

	.panel {
		background: var(--k-surface-alt);
		border: 1px solid var(--k-line);
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 16px;
		min-width: 0;
	}

	.stage {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		min-width: 0;
	}

	.bug-wrap {
		flex: 1;
		display: flex;
		min-width: 0;
		overflow: hidden;
	}
	.bug-wrap :global(.bug) {
		flex: 1;
		min-width: 0;
	}

	.side {
		display: flex;
		flex-direction: column;
	}
	.side-cell {
		height: 64px;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.op {
		width: 44px;
		height: 44px;
		border: 1px solid var(--k-text);
		border-radius: 0;
		background: transparent;
		color: var(--k-text);
		font-family: var(--font-mono);
		font-size: 22px;
		font-weight: var(--type-wght-bold);
		line-height: 1;
		cursor: pointer;
		transition: background var(--dur-fast) var(--ease-snap),
			color var(--dur-fast) var(--ease-snap);
	}
	.op-minus {
		display: none;
		border-color: var(--k-line);
		color: var(--k-text-mute);
	}
	.op-plus {
		background: var(--k-text);
		color: var(--k-surface);
	}
	.op:hover:not(:disabled) {
		background: var(--pulse);
		border-color: var(--pulse);
		color: var(--ink);
	}
	.op:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.hint {
		display: none;
		font-size: 10px;
		letter-spacing: 0.1em;
		color: var(--k-text-dim);
		white-space: nowrap;
	}

	.foot {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.hint-line {
		font-size: 13px;
		color: var(--k-text-mute);
		margin: 0;
	}
	.tools {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.tool {
		font-size: 11px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		padding: 8px 12px;
		border: 1px solid var(--k-line);
		border-radius: 0;
		background: transparent;
		color: var(--k-text-mute);
		cursor: pointer;
		transition: color var(--dur-fast) var(--ease-snap),
			border-color var(--dur-fast) var(--ease-snap),
			background var(--dur-fast) var(--ease-snap);
	}
	.tool:hover:not(:disabled) {
		color: var(--k-text);
		border-color: var(--k-text-mute);
	}
	.tool.on {
		color: var(--ink);
		border-color: var(--color-warning);
		background: var(--color-warning);
	}
	.tool:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.winner {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 12px;
		padding: 16px 0 0;
		border-top: 1px solid var(--k-line);
	}
	.winner-title {
		font-weight: var(--type-wght-display);
		font-size: 20px;
		margin: 0;
	}
	.winner-score {
		display: inline-flex;
		align-items: center;
		font-size: 39px;
		font-weight: 700;
		line-height: 1;
		margin: 0;
	}
	.colon {
		height: 0.467em;
		margin-inline: 0.215em;
	}
	.reset-btn {
		background: transparent;
		color: var(--k-text);
		border: 1px solid var(--k-text);
		border-radius: 0;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		padding: 10px 16px;
		cursor: pointer;
	}
	.reset-btn:hover {
		background: var(--k-text);
		color: var(--k-surface);
	}

	@media (min-width: 640px) {
		.op-minus,
		.hint {
			display: inline-block;
		}
		.panel {
			padding: 24px;
		}
	}
</style>
