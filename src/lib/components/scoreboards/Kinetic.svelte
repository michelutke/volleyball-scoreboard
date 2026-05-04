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

	type BannerInfo = { kind: 'timeout' | 'match' | 'set' | null; team: 'home' | 'guest' | null; label: string };
	const banner: BannerInfo = $derived.by(() => {
		if (timeoutTeam) return { kind: 'timeout', team: timeoutTeam, label: 'TIME OUT' };
		if (homeMatchPoint) return { kind: 'match', team: 'home', label: 'MATCH POINT' };
		if (guestMatchPoint) return { kind: 'match', team: 'guest', label: 'MATCH POINT' };
		if (homeSetPoint) return { kind: 'set', team: 'home', label: 'SET POINT' };
		if (guestSetPoint) return { kind: 'set', team: 'guest', label: 'SET POINT' };
		return { kind: null, team: null, label: '' };
	});
</script>

<div
	class="kinetic"
	class:has-logos={showLogos}
	class:has-banner={banner.kind !== null}
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
	<div class="rows">
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
		</div>
	</div>

	{#if banner.kind}
		<div
			class="banner"
			class:kind-set={banner.kind === 'set'}
			class:kind-match={banner.kind === 'match'}
			class:kind-timeout={banner.kind === 'timeout'}
		>
			<span class="banner-rule" aria-hidden="true"></span>
			<span class="banner-label">{banner.label}</span>
			<span class="banner-team">
				{banner.team === 'home' ? match.homeTeamName.toUpperCase() : banner.team === 'guest' ? match.guestTeamName.toUpperCase() : ''}
			</span>
		</div>
	{/if}
</div>

<style>
	.kinetic {
		display: inline-flex;
		flex-direction: column;
		font-family: var(--font-sans);
		background: var(--k-surface-board);
		color: var(--k-text-board);
		border: 1px solid var(--k-line-board);
	}

	.rows {
		display: grid;
		grid-template-rows: 64px 64px;
	}

	.row {
		display: grid;
		grid-template-columns: minmax(220px, 1fr) 56px auto 88px 32px;
		align-items: stretch;
		background: var(--k-surface-board);
		transition: background 0.3s ease;
	}
	.kinetic.has-logos .row {
		grid-template-columns: 64px minmax(180px, 1fr) 56px auto 88px 32px;
	}

	.row.home {
		border-bottom: 1px solid var(--k-line-board);
	}

	.row.serving {
		background: color-mix(in srgb, var(--k-warm) 6%, var(--k-surface-board));
	}

	.logo {
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
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 0 18px;
		border-right: 1px solid var(--k-line-board);
		min-width: 0;
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
		min-width: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-mono);
		font-feature-settings: 'tnum';
		font-size: 16px;
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
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 4px;
		padding: 0 8px;
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

	.banner {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 10px 16px;
		font-family: var(--font-mono);
		font-size: 12px;
		letter-spacing: 0.18em;
		font-weight: 600;
		border-top: 1px solid var(--k-line-board);
		animation: banner-slide 0.45s var(--ease-mass, cubic-bezier(0.6, 0.05, 0.1, 1));
	}

	.banner-rule {
		display: block;
		width: 24px;
		height: 2px;
	}

	.banner-team {
		font-family: var(--font-display);
		font-size: 13px;
		letter-spacing: 0.06em;
		color: var(--k-text-dim-board);
		margin-left: auto;
	}

	.banner.kind-set {
		background: color-mix(in srgb, var(--k-cool) 12%, var(--k-surface-board));
		color: var(--k-cool);
	}
	.banner.kind-set .banner-rule {
		background: var(--k-cool);
	}

	.banner.kind-match {
		background: color-mix(in srgb, var(--k-warm) 14%, var(--k-surface-board));
		color: var(--k-warm);
	}
	.banner.kind-match .banner-rule {
		background: var(--k-warm);
	}

	.banner.kind-timeout {
		background: color-mix(in srgb, #eab308 18%, var(--k-surface-board));
		color: #eab308;
	}
	.banner.kind-timeout .banner-rule {
		background: #eab308;
	}

	@keyframes banner-slide {
		from {
			transform: translateY(-8px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
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
	:global([data-motion='static']) .banner {
		animation: none;
	}
</style>
