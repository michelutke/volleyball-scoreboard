<script lang="ts">
	import type { MatchState, Team } from '$lib/types.js';
	import type { ScoreboardOptions } from './index.js';

	interface Props {
		match: MatchState;
		homeTimeoutsUsed: number;
		guestTimeoutsUsed: number;
		timeoutTeam: Team | null;
		options?: ScoreboardOptions;
	}

	let { match, homeTimeoutsUsed, guestTimeoutsUsed, timeoutTeam, options = {} }: Props = $props();

	const themeMode = $derived((options.theme as string) ?? 'dark');
	const accentWarm = $derived((options.accentWarm as string) ?? '#ff3d2e');
	const accentCool = $derived((options.accentCool as string) ?? '#1d4ed8');
	const showLogos = $derived(options.showLogos !== false);

	function isAtSetPoint(pts: number, other: number, setNum: number): boolean {
		const target = setNum === 5 ? 15 : 25;
		return pts >= target - 1 && pts > other;
	}

	const homeSetPoint = $derived(
		isAtSetPoint(match.homePoints, match.guestPoints, match.currentSet)
	);
	const guestSetPoint = $derived(
		isAtSetPoint(match.guestPoints, match.homePoints, match.currentSet)
	);
	const homeMatchPoint = $derived(match.homeSets === 2 && homeSetPoint);
	const guestMatchPoint = $derived(match.guestSets === 2 && guestSetPoint);

	const homeServing = $derived(match.serviceTeam === 'home');
	const guestServing = $derived(match.serviceTeam === 'guest');

	const setScoresExpanded = $derived(
		match.showSetScores || match.status === 'finished' || !!timeoutTeam
	);

	function pad(n: number): string {
		return n.toString().padStart(2, '0');
	}

	const surface = $derived(themeMode === 'light' ? '#f5f3ee' : '#0a0a0a');
	const surfaceAlt = $derived(themeMode === 'light' ? '#ebe8e1' : '#161616');
	const text = $derived(themeMode === 'light' ? '#0a0a0a' : '#f5f3ee');
	const textDim = $derived(themeMode === 'light' ? '#6b6b6b' : '#8a8a8a');
	const line = $derived(themeMode === 'light' ? '#c8c5bd' : '#2a2a2a');
</script>

<div
	class="kinetic"
	class:has-logos={showLogos}
	style:--k-surface-board={surface}
	style:--k-surface-board-alt={surfaceAlt}
	style:--k-text-board={text}
	style:--k-text-dim-board={textDim}
	style:--k-line-board={line}
	style:--k-warm={accentWarm}
	style:--k-cool={accentCool}
	style:--home-jersey={match.homeJerseyColor}
	style:--guest-jersey={match.guestJerseyColor}
>
	<!-- HOME ROW -->
	<div class="row home" class:serving={homeServing}>
		{#if showLogos && (match.homeTeamLogo || match.guestTeamLogo)}
			<div class="logo">
				{#if match.homeTeamLogo}
					<img src="/api/image-proxy?url={encodeURIComponent(match.homeTeamLogo)}" alt="" />
				{:else}
					<div class="jersey" style:background={match.homeJerseyColor}></div>
				{/if}
			</div>
		{/if}

		<div class="name-cell">
			<span class="rank k-mono">H</span>
			<span class="name">{match.homeTeamName}</span>
			{#if homeServing}
				<span class="service" aria-hidden="true">●</span>
			{/if}
		</div>

		<div class="sets-cell">
			<span class="sets-num">{pad(match.homeSets)}</span>
		</div>

		<div class="set-scores" class:expanded={setScoresExpanded}>
			{#each match.setScores as s}
				<span class="set-score" class:won={s.home > s.guest}>{s.home}</span>
			{/each}
		</div>

		<div class="points-cell" class:point-home={homeServing}>
			{#key match.homePoints}
				<span class="points k-mono k-tabular">{pad(match.homePoints)}</span>
			{/key}
		</div>

		<div class="timeouts">
			<span class="t-dot" class:used={homeTimeoutsUsed >= 1}></span>
			<span class="t-dot" class:used={homeTimeoutsUsed >= 2}></span>
		</div>

		{#if timeoutTeam === 'home'}
			<div class="banner timeout">TIME OUT</div>
		{:else if homeMatchPoint}
			<div class="banner match">MATCH POINT</div>
		{:else if homeSetPoint}
			<div class="banner set">SET POINT</div>
		{/if}
	</div>

	<!-- GUEST ROW -->
	<div class="row guest" class:serving={guestServing}>
		{#if showLogos && (match.homeTeamLogo || match.guestTeamLogo)}
			<div class="logo">
				{#if match.guestTeamLogo}
					<img src="/api/image-proxy?url={encodeURIComponent(match.guestTeamLogo)}" alt="" />
				{:else}
					<div class="jersey" style:background={match.guestJerseyColor}></div>
				{/if}
			</div>
		{/if}

		<div class="name-cell">
			<span class="rank k-mono">G</span>
			<span class="name">{match.guestTeamName}</span>
			{#if guestServing}
				<span class="service" aria-hidden="true">●</span>
			{/if}
		</div>

		<div class="sets-cell">
			<span class="sets-num">{pad(match.guestSets)}</span>
		</div>

		<div class="set-scores" class:expanded={setScoresExpanded}>
			{#each match.setScores as s}
				<span class="set-score" class:won={s.guest > s.home}>{s.guest}</span>
			{/each}
		</div>

		<div class="points-cell" class:point-guest={guestServing}>
			{#key match.guestPoints}
				<span class="points k-mono k-tabular">{pad(match.guestPoints)}</span>
			{/key}
		</div>

		<div class="timeouts">
			<span class="t-dot" class:used={guestTimeoutsUsed >= 1}></span>
			<span class="t-dot" class:used={guestTimeoutsUsed >= 2}></span>
		</div>

		{#if timeoutTeam === 'guest'}
			<div class="banner timeout">TIME OUT</div>
		{:else if guestMatchPoint}
			<div class="banner match">MATCH POINT</div>
		{:else if guestSetPoint}
			<div class="banner set">SET POINT</div>
		{/if}
	</div>

	<!-- CENTER RULE -->
	<div class="rule" aria-hidden="true">
		<span class="rule-pulse"></span>
	</div>
</div>

<style>
	.kinetic {
		display: grid;
		grid-template-rows: 1fr 1fr;
		font-family: var(--font-sans);
		background: var(--k-surface-board);
		color: var(--k-text-board);
		position: relative;
		overflow: hidden;
		isolation: isolate;
	}

	.row {
		display: grid;
		align-items: stretch;
		grid-template-columns: minmax(280px, 1fr) 64px auto 96px 36px;
		min-height: 72px;
		position: relative;
		background: var(--k-surface-board);
		transition: background 0.3s ease;
	}
	.kinetic.has-logos .row {
		grid-template-columns: 72px minmax(240px, 1fr) 64px auto 96px 36px;
	}

	.row.serving {
		background: color-mix(in srgb, var(--k-warm) 5%, var(--k-surface-board));
	}

	.logo {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 8px;
		border-right: 1px solid var(--k-line-board);
	}
	.logo img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
	.jersey {
		width: 36px;
		height: 36px;
	}

	.name-cell {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 0 20px;
		border-right: 1px solid var(--k-line-board);
		min-width: 0;
	}

	.rank {
		font-size: 11px;
		letter-spacing: 0.16em;
		color: var(--k-text-dim-board);
		flex-shrink: 0;
	}

	.name {
		font-family: var(--font-display);
		font-weight: 700;
		font-variation-settings: 'wght' 700, 'opsz' 28;
		font-size: 22px;
		letter-spacing: -0.02em;
		color: var(--k-text-board);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		flex: 1;
	}

	.service {
		color: var(--k-warm);
		font-size: 14px;
		flex-shrink: 0;
		animation: service-pulse 1.6s ease infinite;
	}
	@keyframes service-pulse {
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.5;
			transform: scale(0.85);
		}
	}

	.sets-cell {
		display: flex;
		align-items: center;
		justify-content: center;
		border-right: 1px solid var(--k-line-board);
		font-family: var(--font-mono);
		font-feature-settings: 'tnum';
	}

	.sets-num {
		font-size: 28px;
		font-weight: 600;
		color: var(--k-text-board);
		letter-spacing: -0.04em;
	}

	.set-scores {
		display: flex;
		align-items: stretch;
		max-width: 0;
		overflow: hidden;
		opacity: 0;
		transition:
			max-width 0.5s var(--ease-mass, cubic-bezier(0.6, 0.05, 0.1, 1)),
			opacity 0.4s ease;
		border-right: 1px solid var(--k-line-board);
	}
	.set-scores.expanded {
		max-width: 400px;
		opacity: 1;
	}

	.set-score {
		min-width: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-mono);
		font-feature-settings: 'tnum';
		font-size: 18px;
		font-weight: 500;
		color: var(--k-text-dim-board);
		border-right: 1px solid var(--k-line-board);
		padding: 0 4px;
	}
	.set-score:last-child {
		border-right: none;
	}
	.row.home .set-score.won {
		color: var(--k-text-board);
		border-bottom: 2px solid var(--home-jersey, var(--k-warm));
	}
	.row.guest .set-score.won {
		color: var(--k-text-board);
		border-bottom: 2px solid var(--guest-jersey, var(--k-cool));
	}

	.points-cell {
		display: flex;
		align-items: center;
		justify-content: center;
		border-right: 1px solid var(--k-line-board);
		position: relative;
		overflow: hidden;
		background: var(--k-surface-board);
	}

	.points-cell.point-home::after,
	.points-cell.point-guest::after {
		content: '';
		position: absolute;
		left: 0;
		bottom: 0;
		height: 2px;
		width: 100%;
		background: var(--k-warm);
		transform-origin: left;
		animation: serve-bar 1.6s ease infinite;
	}
	@keyframes serve-bar {
		0%,
		100% {
			transform: scaleX(0.4);
		}
		50% {
			transform: scaleX(1);
		}
	}

	.points {
		font-size: 44px;
		font-weight: 700;
		font-variation-settings: 'wght' 700;
		color: var(--k-text-board);
		letter-spacing: -0.05em;
		line-height: 1;
		animation: digit-roll 0.42s var(--ease-mass, cubic-bezier(0.6, 0.05, 0.1, 1));
	}

	@keyframes digit-roll {
		from {
			transform: translateY(60%);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	.timeouts {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 4px;
		padding: 0 8px;
		align-items: center;
	}

	.t-dot {
		width: 10px;
		height: 10px;
		border: 1px solid var(--k-text-dim-board);
		border-radius: 50%;
		transition: background 0.3s var(--ease-snap, cubic-bezier(0.2, 0.9, 0.1, 1));
	}
	.row.home .t-dot.used {
		background: var(--home-jersey, var(--k-warm));
		border-color: var(--home-jersey, var(--k-warm));
	}
	.row.guest .t-dot.used {
		background: var(--guest-jersey, var(--k-cool));
		border-color: var(--guest-jersey, var(--k-cool));
	}

	.banner {
		position: absolute;
		right: 0;
		top: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		padding: 0 24px;
		font-family: var(--font-mono);
		font-size: 14px;
		font-weight: 600;
		letter-spacing: 0.18em;
		color: var(--paper, #f5f3ee);
		animation: banner-slide 0.45s var(--ease-mass, cubic-bezier(0.6, 0.05, 0.1, 1));
		z-index: 2;
	}
	.banner.set {
		background: var(--k-cool);
	}
	.banner.match {
		background: var(--k-warm);
	}
	.banner.timeout {
		background: #eab308;
		color: #0a0a0a;
	}

	@keyframes banner-slide {
		from {
			transform: translateX(20px);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}

	.rule {
		position: absolute;
		left: 0;
		right: 0;
		top: 50%;
		height: 1px;
		background: var(--k-line-board);
		pointer-events: none;
		z-index: 1;
	}
	.rule-pulse {
		position: absolute;
		left: 0;
		top: 0;
		height: 100%;
		width: 80px;
		background: linear-gradient(to right, transparent, var(--k-warm), transparent);
		animation: rule-pulse 4s linear infinite;
	}
	@keyframes rule-pulse {
		from {
			transform: translateX(0);
		}
		to {
			transform: translateX(100vw);
		}
	}

	:global([data-motion='static']) .service,
	:global([data-motion='static']) .points-cell::after,
	:global([data-motion='static']) .rule-pulse,
	:global([data-motion='damped']) .rule-pulse {
		animation: none;
	}
	:global([data-motion='static']) .points {
		animation: none;
	}
	:global([data-motion='static']) .banner {
		animation: none;
	}
</style>
