<script lang="ts">
	import { addPoint, removePoint } from '$lib/volleyball.js';
	import type { MatchState, Team } from '$lib/types.js';
	import ScoreboardDisplay from '$lib/components/ScoreboardDisplay.svelte';
	import type { Lang } from '$lib/i18n/landing.js';
	import { t } from '$lib/i18n/landing.js';
	import { reveal } from '$lib/motion.js';
	import RotateCcw from 'lucide-svelte/icons/rotate-ccw';
	import Trophy from 'lucide-svelte/icons/trophy';

	interface Props {
		lang: Lang;
	}

	let { lang }: Props = $props();

	const INITIAL: MatchState = {
		matchId: 0,
		homeTeamName: 'VBC Thun',
		guestTeamName: 'VBC Scorely',
		homeTeamLogo: null,
		guestTeamLogo: null,
		homePoints: 23,
		guestPoints: 22,
		homeSets: 1,
		guestSets: 1,
		currentSet: 3,
		setScores: [
			{ home: 25, guest: 23 },
			{ home: 22, guest: 25 }
		],
		serviceTeam: 'home',
		showSetScores: true,
		showJerseyColors: true,
		status: 'live',
		homeJerseyColor: '#cc0000',
		guestJerseyColor: '#1e6ab5',
		overlayBg: '#0f172a',
		overlayBg2: '#1e293b',
		overlayBgGradient: true,
		overlayText: '#ffffff',
		overlayRounded: true,
		overlayDivider: '#334155',
		overlaySatsBg: '#1e293b',
		overlaySetScoreBg: '#1e293b',
		scoreColor: '#0ea5e9',
		scoreColor2: '#0284c7',
		scoreColorGradient: true,
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
</script>

<section id="demo" class="demo">
	<div class="inner">
		<header class="head">
			<p class="overline k-mono">Demo · Try it</p>
			<h2 class="title k-display" use:reveal={{ y: 32 }}>{tr.title}</h2>
			<p class="subtitle">{tr.subtitle}</p>
		</header>

		<div class="board-frame" use:reveal={{ y: 28, delay: 0.1 }}>
			<div class="board-bar">
				<span class="dot dot-r"></span>
				<span class="dot dot-y"></span>
				<span class="dot dot-g"></span>
				<span class="bar-label k-mono">{tr.obsLabel}</span>
				<span class="bar-id k-mono">KINETIC // LIVE</span>
			</div>
			<div class="board-stage">
				<div class="board-shrink">
					<ScoreboardDisplay
						{match}
						homeTimeoutsUsed={homeTimeouts}
						guestTimeoutsUsed={guestTimeouts}
						{timeoutTeam}
						layoutId="kinetic"
					/>
				</div>
			</div>
		</div>

		{#if matchWon}
			<div class="winner" use:reveal={{ y: 16 }}>
				<p class="winner-title">
					<Trophy size="22" strokeWidth="1.5" class="winner-mark" />
					{match.homeSets > match.guestSets ? 'VBC Thun' : 'VBC Scorely'} {tr.matchWon}
				</p>
				<p class="winner-score k-mono k-tabular">{match.homeSets} : {match.guestSets}</p>
				<button class="reset-btn" onclick={doReset}>{tr.reset}</button>
			</div>
		{:else}
			<div class="controls">
				<div class="ctrl ctrl-home">
					<header class="ctrl-head">
						<span class="ctrl-jersey" style:background={match.homeJerseyColor}></span>
						<span class="ctrl-name">VBC Thun</span>
						<span class="ctrl-meta k-mono">{tr.set} {match.currentSet}</span>
					</header>
					<div class="ctrl-score-row">
						<button
							class="op op-minus"
							onclick={() => doRemovePoint('home')}
							disabled={match.homePoints === 0}
							aria-label="−"
						>−</button>
						<span class="ctrl-score k-mono k-tabular">{match.homePoints}</span>
						<button class="op op-plus" onclick={() => doAddPoint('home')} aria-label="+">+</button>
					</div>
					<button
						class="ctrl-timeout"
						class:on={timeoutTeam === 'home'}
						onclick={() => doTimeout('home')}
						disabled={homeTimeouts >= 2}
					>
						{tr.timeout} <span class="k-mono">{homeTimeouts}/2</span>
					</button>
				</div>

				<div class="ctrl ctrl-guest">
					<header class="ctrl-head">
						<span class="ctrl-jersey" style:background={match.guestJerseyColor}></span>
						<span class="ctrl-name">VBC Scorely</span>
						<span class="ctrl-meta k-mono">{tr.sets}: {match.homeSets}:{match.guestSets}</span>
					</header>
					<div class="ctrl-score-row">
						<button
							class="op op-minus"
							onclick={() => doRemovePoint('guest')}
							disabled={match.guestPoints === 0}
							aria-label="−"
						>−</button>
						<span class="ctrl-score k-mono k-tabular">{match.guestPoints}</span>
						<button class="op op-plus" onclick={() => doAddPoint('guest')} aria-label="+">+</button>
					</div>
					<button
						class="ctrl-timeout"
						class:on={timeoutTeam === 'guest'}
						onclick={() => doTimeout('guest')}
						disabled={guestTimeouts >= 2}
					>
						{tr.timeout} <span class="k-mono">{guestTimeouts}/2</span>
					</button>
				</div>
			</div>

			<div class="reset-row">
				<button class="reset-link k-mono" onclick={doReset}>
				<RotateCcw size="13" strokeWidth="1.5" />
				{tr.reset}
			</button>
			</div>
		{/if}
	</div>
</section>

<style>
	.demo {
		background: var(--k-surface-alt);
		color: var(--k-text);
		padding: 120px var(--grid-margin);
		border-top: 1px solid var(--k-line);
		border-bottom: 1px solid var(--k-line);
	}

	.inner {
		max-width: var(--container-max);
		margin: 0 auto;
	}

	.head {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-bottom: 48px;
		max-width: 800px;
	}

	.overline {
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--k-text-dim);
		margin: 0;
	}

	.title {
		font-size: clamp(36px, 6vw, 80px);
		margin: 0;
		letter-spacing: -0.03em;
		line-height: 0.95;
	}

	.subtitle {
		font-size: 15px;
		line-height: 1.55;
		color: var(--k-text-mute);
		margin: 0;
		max-width: 60ch;
	}

	.board-frame {
		border: 1px solid var(--k-line);
		background: var(--ink);
		margin-bottom: 32px;
		overflow: hidden;
	}

	.board-bar {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 14px;
		border-bottom: 1px solid color-mix(in srgb, var(--paper) 12%, transparent);
		font-size: 11px;
		letter-spacing: 0.08em;
		color: color-mix(in srgb, var(--paper) 60%, transparent);
	}

	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}
	.dot-r { background: color-mix(in srgb, #ef4444 70%, transparent); }
	.dot-y { background: color-mix(in srgb, #eab308 70%, transparent); }
	.dot-g { background: color-mix(in srgb, #22c55e 70%, transparent); }

	.bar-label { margin-left: 4px; }
	.bar-id { margin-left: auto; color: var(--pulse); }

	.board-stage {
		padding: 32px 24px 40px;
		display: flex;
		justify-content: center;
		align-items: center;
		overflow-x: auto;
		min-height: 200px;
	}

	.board-shrink {
		display: inline-flex;
		justify-content: flex-start;
	}

	.controls {
		display: grid;
		grid-template-columns: 1fr;
		gap: 16px;
	}

	.ctrl {
		background: var(--k-surface);
		border: 1px solid var(--k-line);
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.ctrl-head {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.ctrl-jersey {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.ctrl-name {
		font-family: var(--font-display);
		font-weight: var(--type-wght-bold);
		font-size: 16px;
		color: var(--k-text);
	}

	.ctrl-meta {
		margin-left: auto;
		font-size: 11px;
		letter-spacing: 0.1em;
		color: var(--k-text-dim);
	}

	.ctrl-score-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	.op {
		width: 48px;
		height: 48px;
		border: 1px solid var(--k-line);
		background: transparent;
		color: var(--k-text);
		font-size: 22px;
		font-weight: 600;
		cursor: pointer;
		transition:
			background var(--dur-fast) var(--ease-snap),
			border-color var(--dur-fast) var(--ease-snap);
	}
	.op:hover:not(:disabled) {
		border-color: var(--k-text-mute);
		background: color-mix(in srgb, var(--k-text) 4%, transparent);
	}
	.op:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
	.op-plus {
		background: var(--pulse);
		color: var(--paper);
		border-color: var(--pulse);
	}
	.op-plus:hover:not(:disabled) {
		background: var(--pulse-deep);
		border-color: var(--pulse-deep);
	}

	.ctrl-score {
		font-size: 48px;
		font-weight: 700;
		color: var(--k-text);
		letter-spacing: -0.04em;
		line-height: 1;
	}

	.ctrl-timeout {
		font-family: var(--font-mono);
		font-size: 12px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		padding: 10px;
		background: transparent;
		border: 1px solid var(--k-line);
		color: var(--k-text-mute);
		cursor: pointer;
		transition:
			color var(--dur-fast) var(--ease-snap),
			border-color var(--dur-fast) var(--ease-snap),
			background var(--dur-fast) var(--ease-snap);
	}
	.ctrl-timeout:hover:not(:disabled) {
		color: var(--k-text);
		border-color: var(--k-text-mute);
	}
	.ctrl-timeout.on {
		color: #eab308;
		border-color: #eab308;
		background: color-mix(in srgb, #eab308 10%, transparent);
	}
	.ctrl-timeout:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.reset-row {
		margin-top: 20px;
		text-align: center;
	}
	.reset-link {
		background: transparent;
		border: none;
		color: var(--k-text-dim);
		font-size: 11px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		cursor: pointer;
		padding: 8px;
		transition: color var(--dur-fast) var(--ease-snap);
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.reset-link:hover {
		color: var(--k-text);
	}

	.winner {
		text-align: center;
		padding: 32px;
		border: 1px solid var(--pulse);
		background: color-mix(in srgb, var(--pulse) 6%, transparent);
		display: flex;
		flex-direction: column;
		gap: 14px;
		align-items: center;
	}
	.winner-title {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 20px;
		margin: 0;
		display: inline-flex;
		align-items: center;
		gap: 10px;
		color: var(--pulse);
	}
	.winner-score {
		font-size: 36px;
		font-weight: 600;
		color: var(--k-text);
		margin: 0;
	}
	.reset-btn {
		background: var(--pulse);
		color: var(--paper);
		font-weight: 600;
		font-size: 13px;
		padding: 10px 20px;
		border: none;
		border-radius: 999px;
		cursor: pointer;
		transition: background var(--dur-fast) var(--ease-snap);
	}
	.reset-btn:hover {
		background: var(--pulse-deep);
	}

	@media (min-width: 640px) {
		.controls {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
