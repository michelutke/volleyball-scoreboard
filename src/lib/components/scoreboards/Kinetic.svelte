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

	function pad(n: number): string {
		return n.toString().padStart(2, '0');
	}

	const surface = $derived(themeMode === 'light' ? '#f5f3ee' : '#0a0a0a');
	const surfaceAlt = $derived(themeMode === 'light' ? '#ebe8e1' : '#161616');
	const text = $derived(themeMode === 'light' ? '#0a0a0a' : '#f5f3ee');
	const textDim = $derived(themeMode === 'light' ? '#6b6b6b' : '#8a8a8a');
	const line = $derived(themeMode === 'light' ? '#c8c5bd' : '#2a2a2a');

	type BannerKind = 'timeout' | 'match' | 'set' | null;
	function bannerFor(team: Team): { kind: BannerKind; label: string } {
		if (timeoutTeam === team) return { kind: 'timeout', label: 'TIME OUT' };
		if (team === 'home' && homeMatchPoint) return { kind: 'match', label: 'MATCH POINT' };
		if (team === 'guest' && guestMatchPoint) return { kind: 'match', label: 'MATCH POINT' };
		if (team === 'home' && homeSetPoint) return { kind: 'set', label: 'SET POINT' };
		if (team === 'guest' && guestSetPoint) return { kind: 'set', label: 'SET POINT' };
		return { kind: null, label: '' };
	}

	const homeBanner = $derived(bannerFor('home'));
	const guestBanner = $derived(bannerFor('guest'));
</script>

<div
	class="kinetic"
	class:has-logos={showLogos}
	data-show-sets={match.showSetScores || match.status === 'finished' || !!timeoutTeam || match.setScores.length > 0}
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
		{#if showLogos}
			<div class="logo">
				{#if match.homeTeamLogo}
					<img src="/api/image-proxy?url={encodeURIComponent(match.homeTeamLogo)}" alt="" />
				{:else}
					<div class="jersey" style:background={match.homeJerseyColor}></div>
				{/if}
			</div>
		{/if}

		<div class="name-cell">
			<span class="name">{match.homeTeamName.toUpperCase()}</span>
			{#if homeServing}
				<span class="service" aria-hidden="true">●</span>
			{/if}
		</div>

		<div class="sets-cell">
			<span class="sets-num">{match.homeSets}</span>
		</div>

		<div class="set-scores">
			{#each match.setScores as s}
				<span class="set-score" class:won={s.home > s.guest}>{s.home}</span>
			{/each}
		</div>

		<div class="points-cell" class:point-home={homeServing}>
			{#key match.homePoints}
				<span class="points">{pad(match.homePoints)}</span>
			{/key}
		</div>

		<div class="timeouts">
			<span class="t-dot" class:used={homeTimeoutsUsed >= 1}></span>
			<span class="t-dot" class:used={homeTimeoutsUsed >= 2}></span>
		</div>

		{#if homeBanner.kind}
			<div
				class="row-banner"
				class:kind-set={homeBanner.kind === 'set'}
				class:kind-match={homeBanner.kind === 'match'}
				class:kind-timeout={homeBanner.kind === 'timeout'}
			>
				{homeBanner.label}
			</div>
		{/if}
	</div>

	<!-- GUEST ROW -->
	<div class="row guest" class:serving={guestServing}>
		{#if showLogos}
			<div class="logo">
				{#if match.guestTeamLogo}
					<img src="/api/image-proxy?url={encodeURIComponent(match.guestTeamLogo)}" alt="" />
				{:else}
					<div class="jersey" style:background={match.guestJerseyColor}></div>
				{/if}
			</div>
		{/if}

		<div class="name-cell">
			<span class="name">{match.guestTeamName.toUpperCase()}</span>
			{#if guestServing}
				<span class="service" aria-hidden="true">●</span>
			{/if}
		</div>

		<div class="sets-cell">
			<span class="sets-num">{match.guestSets}</span>
		</div>

		<div class="set-scores">
			{#each match.setScores as s}
				<span class="set-score" class:won={s.guest > s.home}>{s.guest}</span>
			{/each}
		</div>

		<div class="points-cell" class:point-guest={guestServing}>
			{#key match.guestPoints}
				<span class="points">{pad(match.guestPoints)}</span>
			{/key}
		</div>

		<div class="timeouts">
			<span class="t-dot" class:used={guestTimeoutsUsed >= 1}></span>
			<span class="t-dot" class:used={guestTimeoutsUsed >= 2}></span>
		</div>

		{#if guestBanner.kind}
			<div
				class="row-banner"
				class:kind-set={guestBanner.kind === 'set'}
				class:kind-match={guestBanner.kind === 'match'}
				class:kind-timeout={guestBanner.kind === 'timeout'}
			>
				{guestBanner.label}
			</div>
		{/if}
	</div>
</div>

<style>
	.kinetic {
		display: inline-flex;
		flex-direction: column;
		align-items: flex-start;
		font-family: var(--font-sans);
		color: var(--k-text-board);
	}

	.row {
		display: flex;
		align-items: stretch;
		height: 64px;
		width: max-content;
		background: var(--k-surface-board);
		border: 1px solid var(--k-line-board);
		transition: background 0.3s ease;
	}
	.row.guest {
		border-top: none;
	}
	.row.serving {
		background: color-mix(in srgb, var(--k-warm) 6%, var(--k-surface-board));
	}

	.logo {
		flex: 0 0 64px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 8px;
		border-right: 1px solid var(--k-line-board);
		background: var(--k-surface-board-alt);
	}
	.logo img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
	.jersey {
		width: 32px;
		height: 32px;
	}

	.name-cell {
		flex: 1 1 260px;
		min-width: 200px;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 0 22px;
		border-right: 1px solid var(--k-line-board);
		overflow: hidden;
	}

	.name {
		font-family: var(--font-display);
		font-weight: 700;
		font-variation-settings: 'wght' 700, 'opsz' 28;
		font-size: 18px;
		letter-spacing: -0.01em;
		color: var(--k-text-board);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		flex: 1;
		min-width: 0;
	}

	.service {
		color: var(--k-warm);
		font-size: 12px;
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
		flex: 0 0 64px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-right: 1px solid var(--k-line-board);
		font-family: var(--font-mono);
		font-feature-settings: 'tnum';
	}

	.sets-num {
		font-size: 24px;
		font-weight: 600;
		color: var(--k-text-board);
		letter-spacing: -0.04em;
	}

	.set-scores {
		display: flex;
		align-items: stretch;
		overflow: hidden;
	}
	.kinetic[data-show-sets='true'] .set-scores {
		border-right: 1px solid var(--k-line-board);
	}
	.kinetic[data-show-sets='false'] .set-scores {
		display: none;
	}

	.set-score {
		flex: 0 0 56px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-mono);
		font-feature-settings: 'tnum';
		font-size: 18px;
		font-weight: 500;
		color: var(--k-text-dim-board);
		border-right: 1px solid var(--k-line-board);
		padding: 0 8px;
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
		flex: 0 0 100px;
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
		font-family: var(--font-mono);
		font-feature-settings: 'tnum';
		font-size: 36px;
		font-weight: 700;
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
		flex: 0 0 40px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 4px;
		padding: 0 10px;
		align-items: center;
	}

	.t-dot {
		width: 8px;
		height: 8px;
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

	.row-banner {
		flex: 0 0 auto;
		margin-left: 4px;
		padding: 0 22px;
		display: flex;
		align-items: center;
		font-family: var(--font-mono);
		font-size: 13px;
		letter-spacing: 0.18em;
		font-weight: 600;
		white-space: nowrap;
		animation: banner-slide 0.45s var(--ease-mass, cubic-bezier(0.6, 0.05, 0.1, 1));
	}

	.row-banner.kind-set {
		background: var(--k-cool);
		color: var(--paper, #f5f3ee);
	}
	.row-banner.kind-match {
		background: var(--k-warm);
		color: var(--paper, #f5f3ee);
	}
	.row-banner.kind-timeout {
		background: #eab308;
		color: #0a0a0a;
	}

	@keyframes banner-slide {
		from {
			transform: translateX(12px);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}

	:global([data-motion='static']) .service,
	:global([data-motion='static']) .points-cell::after,
	:global([data-motion='damped']) .points-cell::after {
		animation: none;
	}
	:global([data-motion='static']) .points {
		animation: none;
	}
	:global([data-motion='static']) .row-banner {
		animation: none;
	}

	/* Narrow screens: hide set-scores entirely so the row stays compact and readable */
	@media (max-width: 720px) {
		.set-scores {
			display: none !important;
		}
	}
</style>
