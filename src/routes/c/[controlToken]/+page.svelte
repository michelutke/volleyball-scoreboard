<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { MatchState, Team, SetTimeline, TimelineEvent } from '$lib/types.js';

	let { data } = $props();

	const controlToken = $derived(data.controlToken);
	let match = $state<MatchState | null>(null);
	let matchTimeouts = $state({ home: 0, guest: 0 });
	let loading = $state(false);
	let activeTimeout = $state<{ team: Team; teamName: string; secondsLeft: number } | null>(null);
	let timeoutInterval: ReturnType<typeof setInterval> | null = null;

	// Dialog state
	let advancedOpen = $state(false);
	let advancedDialogEl = $state<HTMLDialogElement | null>(null);

	$effect(() => {
		match = data.activeMatch;
		matchTimeouts = data.timeouts;
	});

	$effect(() => {
		if (advancedDialogEl) {
			if (advancedOpen) advancedDialogEl.showModal();
			else advancedDialogEl.close();
		}
	});

	async function api(body: Record<string, unknown>) {
		loading = true;
		try {
			const res = await fetch(`/api/c/${controlToken}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			const updated = await res.json();
			if (res.ok) {
				match = updated;
				invalidateAll();
			}
		} finally {
			loading = false;
		}
	}

	function addPoint(team: Team) {
		if (!match) return;
		api({ action: 'addPoint', team });
	}

	function removePoint(team: Team) {
		if (!match) return;
		api({ action: 'removePoint', team });
	}

	function addSet(team: Team) {
		if (!match) return;
		api({ action: 'addSet', team });
	}

	function removeSet(team: Team) {
		if (!match) return;
		api({ action: 'removeSet', team });
	}

	function switchService() {
		if (!match) return;
		api({ action: 'switchService' });
	}

	function resetMatch() {
		if (!match) return;
		if (!confirm('Match wirklich zurücksetzen?')) return;
		api({ action: 'reset' });
	}

	function undo() {
		if (!match) return;
		api({ action: 'undo' });
	}

	async function callTimeout(team: Team) {
		if (!match || activeTimeout) return;
		const res = await fetch(`/api/c/${controlToken}/timeout`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ team })
		});
		if (res.ok) {
			matchTimeouts = {
				...matchTimeouts,
				[team]: matchTimeouts[team] + 1
			};
			invalidateAll();
			const teamName = team === 'home' ? match.homeTeamName : match.guestTeamName;
			activeTimeout = { team, teamName, secondsLeft: 30 };
			if (timeoutInterval) clearInterval(timeoutInterval);
			timeoutInterval = setInterval(() => {
				if (!activeTimeout) return;
				activeTimeout = { ...activeTimeout, secondsLeft: activeTimeout.secondsLeft - 1 };
				if (activeTimeout.secondsLeft <= 0) {
					if (timeoutInterval) clearInterval(timeoutInterval);
					timeoutInterval = null;
					activeTimeout = null;
				}
			}, 1000);
		}
	}

	async function cancelTimeout() {
		if (!match || !activeTimeout) return;
		if (!confirm('Auszeit falsch eingegeben?')) return;
		const res = await fetch(`/api/c/${controlToken}/timeout`, {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ team: activeTimeout.team })
		});
		if (res.ok) {
			matchTimeouts = {
				...matchTimeouts,
				[activeTimeout.team]: Math.max(0, matchTimeouts[activeTimeout.team] - 1)
			};
			if (timeoutInterval) clearInterval(timeoutInterval);
			timeoutInterval = null;
			activeTimeout = null;
			invalidateAll();
		}
	}

	function darkenHex(hex: string, amount = 16): string {
		const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
		const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
		const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
		return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
	}

	function lightenHex(hex: string, amount = 16): string {
		const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
		const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
		const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
		return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
	}

	function hexWithAlpha(hex: string, alpha: number): string {
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		return `rgba(${r},${g},${b},${alpha})`;
	}

	function overlayBgStyle(bg: string, bg2: string, gradient: boolean, dark = false): string {
		const c1 = dark ? darkenHex(bg) : bg;
		const c2 = dark ? darkenHex(bg2) : bg2;
		return gradient ? `linear-gradient(to right, ${c1}, ${c2})` : c1;
	}

	function previewScoreBg(m: MatchState): string {
		return m.scoreColorGradient
			? `linear-gradient(to bottom, ${m.scoreColor}, ${m.scoreColor2})`
			: m.scoreColor;
	}

	let setScoresExpanded = $derived(match?.showSetScores || match?.status === 'finished' || !!activeTimeout);

	let setTimelines = $derived.by((): SetTimeline[] => {
		const history = data.scoreHistory;
		const tHistory = data.timeoutHistory;
		if (!history.length) return [];

		const setMap = new Map<number, typeof history>();
		for (const row of history) {
			const arr = setMap.get(row.currentSet) ?? [];
			arr.push(row);
			setMap.set(row.currentSet, arr);
		}

		const timelines: SetTimeline[] = [];
		for (const [setNum, rows] of setMap) {
			const events: TimelineEvent[] = [];
			const setTimeouts = tHistory.filter((t) => t.set === setNum);
			let tIdx = 0;

			for (let i = 1; i < rows.length; i++) {
				const prev = rows[i - 1];
				const curr = rows[i];

				while (tIdx < setTimeouts.length && setTimeouts[tIdx].createdAt < curr.createdAt) {
					events.push({
						type: 'timeout',
						team: setTimeouts[tIdx].team as Team,
						homePoints: prev.homePoints,
						guestPoints: prev.guestPoints
					});
					tIdx++;
				}

				if (curr.homePoints > prev.homePoints) {
					events.push({ type: 'point', team: 'home', homePoints: curr.homePoints, guestPoints: curr.guestPoints });
				} else if (curr.guestPoints > prev.guestPoints) {
					events.push({ type: 'point', team: 'guest', homePoints: curr.homePoints, guestPoints: curr.guestPoints });
				}
			}

			while (tIdx < setTimeouts.length) {
				const lastRow = rows[rows.length - 1];
				events.push({
					type: 'timeout',
					team: setTimeouts[tIdx].team as Team,
					homePoints: lastRow.homePoints,
					guestPoints: lastRow.guestPoints
				});
				tIdx++;
			}

			const setScores = match?.setScores ?? [];
			const finalScore = setNum <= setScores.length ? setScores[setNum - 1] : null;

			if (finalScore) {
				const winner: Team = finalScore.home > finalScore.guest ? 'home' : 'guest';
				events.push({ type: 'point', team: winner, homePoints: finalScore.home, guestPoints: finalScore.guest });
			}

			timelines.push({ set: setNum, events, finalScore });
		}

		return timelines;
	});
</script>

<svelte:head>
	<title>Scoring — Geteilter Zugriff</title>
</svelte:head>

<div class="control">
	<!-- Nav bar -->
	<div class="nav-bar">
		<div class="share-banner">
			&#128279; Geteilter Zugriff — Nur für dieses Spiel
		</div>
	</div>

	{#if !match}
		<div class="start-screen">
			<p class="text-gray-400">Match nicht gefunden</p>
		</div>
	{:else}
		<div class="grid-layout">
			<!-- Scoring Card -->
			<div class="card col-span-full">
				<div class="card-header">
					<span class="card-icon">&#9878;</span>
					<h2>Scoring</h2>
				</div>
				<div class="card-body flex items-center justify-center">
					<div class="scoreboard-preview" class:with-jersey={match.showJerseyColors} class:has-logo={!!(match.homeTeamLogo || match.guestTeamLogo)} class:rounded={match.overlayRounded} style:--overlay-border={match.overlayDivider} style:color={match.overlayText}>
						<div class="preview-row">
							{#if match.showJerseyColors}
								<div class="preview-jersey" style:background-color={match.homeJerseyColor}>
									{#if match.homeTeamLogo}
										<img src="/api/image-proxy?url={encodeURIComponent(match.homeTeamLogo)}" alt="" class="preview-jersey-logo" />
									{/if}
								</div>
							{/if}
							<div class="preview-name preview-name-dark" style:background={overlayBgStyle(match.overlayBg, match.overlayBg2, match.overlayBgGradient, true)} style:color={match.overlayText}>
								{match.homeTeamName.toUpperCase()}
								<img src="/vbcthun-ball.svg" alt="" class="preview-service" class:preview-service-hidden={match.serviceTeam !== 'home'} />
							</div>
							<div class="preview-sets" style:background-color={match.overlaySatsBg} style:color={match.overlayText} style:border-color={match.overlayDivider}>{match.homeSets}</div>
							<div class="preview-set-scores" class:expanded={setScoresExpanded}>
								{#each match.setScores as s}
									<div class="preview-set-cell" class:preview-set-cell-winner={s.home > s.guest} style:--winner-color={match.homeJerseyColor} style:background-color={match.overlaySetScoreBg} style:border-left-color={match.overlayDivider} style:color={s.home > s.guest ? match.overlayText : hexWithAlpha(match.overlayText, 0.5)}>{s.home}</div>
								{/each}
							</div>
							<div class="preview-points" style:background={previewScoreBg(match)}>{match.homePoints}</div>
							<div class="preview-timeout-boxes" style:--jersey-color={match.homeJerseyColor}>
								<div class="preview-timeout-box" class:taken={matchTimeouts.home >= 2} style:background-color={matchTimeouts.home < 2 ? match.homeJerseyColor : undefined}></div>
								<div class="preview-timeout-box" class:taken={matchTimeouts.home >= 1} style:background-color={matchTimeouts.home < 1 ? match.homeJerseyColor : undefined}></div>
							</div>
						</div>
						<div class="preview-row">
							{#if match.showJerseyColors}
								<div class="preview-jersey" style:background-color={match.guestJerseyColor}>
									{#if match.guestTeamLogo}
										<img src="/api/image-proxy?url={encodeURIComponent(match.guestTeamLogo)}" alt="" class="preview-jersey-logo" />
									{/if}
								</div>
							{/if}
							<div class="preview-name" style:background={overlayBgStyle(match.overlayBg, match.overlayBg2, match.overlayBgGradient)} style:color={match.overlayText}>
								{match.guestTeamName.toUpperCase()}
								<img src="/vbcthun-ball.svg" alt="" class="preview-service" class:preview-service-hidden={match.serviceTeam !== 'guest'} />
							</div>
							<div class="preview-sets" style:background-color={match.overlaySatsBg} style:color={match.overlayText} style:border-color={match.overlayDivider}>{match.guestSets}</div>
							<div class="preview-set-scores" class:expanded={setScoresExpanded}>
								{#each match.setScores as s}
									<div class="preview-set-cell" class:preview-set-cell-winner={s.guest > s.home} style:--winner-color={match.guestJerseyColor} style:background-color={match.overlaySetScoreBg} style:border-left-color={match.overlayDivider} style:color={s.guest > s.home ? match.overlayText : hexWithAlpha(match.overlayText, 0.5)}>{s.guest}</div>
								{/each}
							</div>
							<div class="preview-points" style:background={previewScoreBg(match)}>{match.guestPoints}</div>
							<div class="preview-timeout-boxes" style:--jersey-color={match.guestJerseyColor}>
								<div class="preview-timeout-box" class:taken={matchTimeouts.guest >= 2} style:background-color={matchTimeouts.guest < 2 ? match.guestJerseyColor : undefined}></div>
								<div class="preview-timeout-box" class:taken={matchTimeouts.guest >= 1} style:background-color={matchTimeouts.guest < 1 ? match.guestJerseyColor : undefined}></div>
							</div>
						</div>
					</div>
				</div>

				{#if match.setScores.length > 0}
					<div class="set-scores">
						{#each match.setScores as s, i}
							<span class="set-badge" style:border-color={s.home > s.guest ? match.homeJerseyColor : match.guestJerseyColor}>S{i + 1}: {s.home}-{s.guest}</span>
						{/each}
					</div>
				{/if}

				<div class="timeout-info">
					<span class="timeout-info-team">{match.homeTeamName}: {matchTimeouts.home}/2 Auszeiten</span>
					<span class="timeout-info-team">{match.guestTeamName}: {matchTimeouts.guest}/2 Auszeiten</span>
				</div>

				<div class="scoring-grid">
					<div class="scoring-team">
						<div class="scoring-team-header">
							<span class="scoring-team-icon">&#9675;</span>
							<span class="font-bold">{match.homeTeamName}</span>
						</div>
						<div class="scoring-team-btns">
							<button onclick={() => addPoint('home')} disabled={loading || !!activeTimeout} class="btn-point">+ Punkt</button>
							<div class="scoring-secondary">
								<button onclick={() => callTimeout('home')} disabled={matchTimeouts.home >= 2 || !!activeTimeout} class="btn-action">&#9201; Auszeit</button>
								<button onclick={() => { if (match?.serviceTeam !== 'home') switchService(); }} class="btn-service" class:btn-service-active={match?.serviceTeam === 'home'} disabled={match?.serviceTeam === 'home'}>
									&#127952; Service
								</button>
							</div>
						</div>
					</div>
					<div class="scoring-team">
						<div class="scoring-team-header">
							<span class="scoring-team-icon">&#128101;</span>
							<span class="font-bold">{match.guestTeamName}</span>
						</div>
						<div class="scoring-team-btns">
							<button onclick={() => addPoint('guest')} disabled={loading || !!activeTimeout} class="btn-point">+ Punkt</button>
							<div class="scoring-secondary">
								<button onclick={() => callTimeout('guest')} disabled={matchTimeouts.guest >= 2 || !!activeTimeout} class="btn-action">&#9201; Auszeit</button>
								<button onclick={() => { if (match?.serviceTeam !== 'guest') switchService(); }} class="btn-service" class:btn-service-active={match?.serviceTeam === 'guest'} disabled={match?.serviceTeam === 'guest'}>
									&#127952; Service
								</button>
							</div>
						</div>
					</div>
				</div>

				{#if activeTimeout}
					<div class="timeout-banner">
						Auszeit {activeTimeout.teamName} — {activeTimeout.secondsLeft}s
						<button onclick={cancelTimeout} class="btn-timeout-cancel">&#10005; Abbrechen</button>
					</div>
				{/if}

				<div class="scoring-actions">
					<button onclick={() => advancedOpen = true} class="btn-action">&#9881; Erweitert</button>
					<button onclick={undo} disabled={loading} class="btn-action">&#8617; Zurück</button>
				</div>
			</div>

			<!-- Spielverlauf Card -->
			{#if setTimelines.length > 0}
				<div class="card col-span-full">
					<div class="card-header">
						<span class="card-icon">&#128200;</span>
						<h2>Spielverlauf</h2>
					</div>
					<div class="card-body">
						{#each setTimelines as timeline}
							{@const lastPointIdx = timeline.events.findLastIndex((e) => e.type === 'point')}
							<div class="timeline-set">
								<div class="timeline-set-header">
									<span>Satz {timeline.set}</span>
									{#if timeline.finalScore}
										<span class="timeline-final-score">{timeline.finalScore.home}:{timeline.finalScore.guest}</span>
										<span class="timeline-winner-name">{timeline.finalScore.home > timeline.finalScore.guest ? match?.homeTeamName : match?.guestTeamName}</span>
									{:else}
										<span class="timeline-live-badge">Live</span>
									{/if}
								</div>
								<div class="timeline-scroll">
									<div class="timeline-grid">
										<div class="timeline-row">
											{#each timeline.events as evt, idx}
												{#if evt.type === 'timeout' && evt.team === 'home'}
													<div class="timeline-cell timeline-cell-timeout">&#9201;</div>
												{:else if evt.type === 'point' && evt.team === 'home'}
													<div class="timeline-cell timeline-cell-home" class:timeline-cell-winner={timeline.finalScore && idx === lastPointIdx} style:background-color="{match?.homeJerseyColor}22">{evt.homePoints}</div>
												{:else}
													<div class="timeline-cell timeline-cell-dim">&ndash;</div>
												{/if}
											{/each}
										</div>
										<div class="timeline-row">
											{#each timeline.events as evt, idx}
												{#if evt.type === 'timeout' && evt.team === 'guest'}
													<div class="timeline-cell timeline-cell-timeout">&#9201;</div>
												{:else if evt.type === 'point' && evt.team === 'guest'}
													<div class="timeline-cell timeline-cell-guest" class:timeline-cell-winner={timeline.finalScore && idx === lastPointIdx} style:background-color="{match?.guestJerseyColor}22">{evt.guestPoints}</div>
												{:else}
													<div class="timeline-cell timeline-cell-dim">&ndash;</div>
												{/if}
											{/each}
										</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		{#if match.status === 'finished'}
			<div class="match-finished">
				<p class="text-xl font-bold">Match beendet!</p>
				<p class="text-gray-300">
					{match.homeSets > match.guestSets ? match.homeTeamName : match.guestTeamName} gewinnt {match.homeSets}:{match.guestSets}
				</p>
			</div>
		{/if}

		<!-- Advanced Dialog -->
		<dialog bind:this={advancedDialogEl} class="dialog" onclose={() => advancedOpen = false} onclick={(e) => { if (e.target === e.currentTarget) advancedOpen = false; }}>
			<div class="dialog-header">
				<h3>Erweitert</h3>
				<button class="dialog-close" onclick={() => advancedOpen = false}>&times;</button>
			</div>
			<div class="dialog-body">
				<div class="advanced-grid">
					<div class="advanced-team">
						<div class="advanced-team-header">{match?.homeTeamName}</div>
						<button onclick={() => removePoint('home')} disabled={loading} class="btn-action">&minus; Punkt</button>
						<button onclick={() => addSet('home')} disabled={loading} class="btn-action">+ Satz</button>
						<button onclick={() => removeSet('home')} disabled={loading} class="btn-action">&minus; Satz</button>
					</div>
					<div class="advanced-team">
						<div class="advanced-team-header">{match?.guestTeamName}</div>
						<button onclick={() => removePoint('guest')} disabled={loading} class="btn-action">&minus; Punkt</button>
						<button onclick={() => addSet('guest')} disabled={loading} class="btn-action">+ Satz</button>
						<button onclick={() => removeSet('guest')} disabled={loading} class="btn-action">&minus; Satz</button>
					</div>
				</div>
			</div>
			<div class="dialog-footer">
				<button onclick={resetMatch} class="btn-action btn-action-danger">&#8635; Reset</button>
			</div>
		</dialog>
	{/if}
</div>

<style>
	.control {
		min-height: 100vh;
		background: var(--color-bg-base);
		color: var(--color-text-primary);
		padding: 20px;
		font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
	}

	.nav-bar {
		display: flex;
		align-items: center;
		gap: 16px;
		max-width: 1100px;
		margin: 0 auto 16px;
	}

	.share-banner {
		background: color-mix(in srgb, var(--color-accent) 12%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-accent) 30%, transparent);
		color: var(--color-accent);
		border-radius: 8px;
		padding: 8px 16px;
		font-size: 13px;
		font-weight: 600;
	}

	.start-screen {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 80vh;
	}

	.grid-layout {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
		max-width: 1100px;
		margin: 0 auto;
	}

	.col-span-full { grid-column: 1 / -1; }

	.card {
		background: var(--color-bg-panel);
		border: 1px solid var(--color-border-default);
		border-radius: 12px;
		overflow: hidden;
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 14px 20px;
		border-bottom: 1px solid var(--color-border-default);
		font-weight: 700;
		font-size: 16px;
	}

	.card-header h2 { margin: 0; font-size: 16px; }
	.card-icon { color: var(--color-accent); font-size: 18px; }

	.card-body {
		padding: 16px 20px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	/* Scoreboard preview */
	.scoreboard-preview {
		display: grid;
		grid-template-rows: 48px 48px;
		row-gap: 3px;
		padding: 20px;
		border-radius: 8px;
	}

	.scoreboard-preview.with-jersey {
		grid-template-columns: 8px minmax(160px, auto) 44px auto 52px auto;
	}

	.scoreboard-preview.with-jersey.has-logo {
		grid-template-columns: 48px minmax(160px, auto) 44px auto 52px auto;
	}

	.scoreboard-preview:not(.with-jersey) {
		grid-template-columns: minmax(160px, auto) 44px auto 52px auto;
	}

	.preview-row {
		display: grid;
		grid-template-columns: subgrid;
		grid-column: 1 / -1;
		align-items: stretch;
	}

	.preview-jersey { flex-shrink: 0; position: relative; }
	.preview-jersey-logo {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: contain;
		padding: 4px;
	}

	.preview-name {
		padding: 0 16px;
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 18px;
		font-weight: 800;
	}

	.scoreboard-preview.rounded:not(.with-jersey) .preview-row:first-child .preview-name { border-radius: 8px 0 0 0; }
	.scoreboard-preview.rounded.with-jersey .preview-row:first-child .preview-jersey { border-radius: 8px 0 0 0; }
	.scoreboard-preview.rounded .preview-row:first-child .preview-timeout-boxes { border-radius: 0 8px 0 0; }
	.scoreboard-preview.rounded:not(.with-jersey) .preview-row:last-child .preview-name { border-radius: 0 0 0 8px; }
	.scoreboard-preview.rounded.with-jersey .preview-row:last-child .preview-jersey { border-radius: 0 0 0 8px; }
	.scoreboard-preview.rounded .preview-row:last-child .preview-timeout-boxes { border-radius: 0 0 8px 0; }
	.preview-service { width: 20px; height: 20px; opacity: 0.85; margin-left: auto; }
	.preview-service-hidden { visibility: hidden; }

	.preview-sets {
		width: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 22px;
		font-weight: 800;
		border-left: 2px solid var(--overlay-border, #2a2a2a);
		font-variant-numeric: tabular-nums;
	}

	.preview-points {
		width: 52px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 26px;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
	}

	.preview-set-scores {
		display: flex;
		align-items: stretch;
		max-width: 0;
		overflow: hidden;
		opacity: 0;
		transition: max-width 0.4s ease, opacity 0.3s ease;
	}

	.preview-set-scores.expanded { max-width: 300px; opacity: 1; }

	.preview-set-cell {
		color: var(--color-text-secondary);
		width: 38px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 18px;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		border-left: 1px solid var(--overlay-border, #2a2a2a);
		border-bottom: 2px solid transparent;
	}

	.preview-set-cell-winner { border-bottom-color: var(--winner-color); color: var(--color-text-primary); }

	.preview-timeout-boxes { display: flex; flex-direction: column; gap: 0; justify-content: center; border-left: 1px solid var(--overlay-text, white); overflow: hidden; }
	.preview-timeout-box { width: 8px; height: 50%; }
	.preview-timeout-box:first-child { border-bottom: 1px solid var(--overlay-text, white); }
	.scoreboard-preview.rounded .preview-row:first-child .preview-timeout-box:first-child { border-radius: 0 4px 0 0; }
	.scoreboard-preview.rounded .preview-row:last-child .preview-timeout-box:last-child { border-radius: 0 0 4px 0; }
	.preview-timeout-box.taken { background: transparent; border: 1px solid var(--jersey-color); border-left: none; }

	.set-scores { display: flex; justify-content: center; gap: 8px; padding: 0 20px 16px; }

	.set-badge {
		background: var(--color-border-default);
		color: var(--color-text-secondary);
		padding: 4px 10px;
		border-radius: 6px;
		font-size: 12px;
		font-variant-numeric: tabular-nums;
		border: 2px solid transparent;
	}

	.timeout-info {
		display: flex;
		justify-content: center;
		gap: 24px;
		padding: 8px 20px 16px;
		font-size: 13px;
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
	}

	.timeout-info-team { background: var(--color-border-default); padding: 4px 12px; border-radius: 6px; }

	/* Scoring grid */
	.scoring-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0;
		border-top: 1px solid var(--color-border-default);
	}

	.scoring-team { padding: 20px 24px; }
	.scoring-team:first-child { border-right: 1px solid var(--color-border-default); }

	.scoring-team-header {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 16px;
		font-size: 16px;
	}

	.scoring-team-btns { display: flex; flex-direction: column; }
	.scoring-team-icon { font-size: 18px; }

	.btn-point {
		width: 100%;
		height: 64px;
		border: 2px solid var(--color-accent-mid);
		background: linear-gradient(135deg, var(--color-accent-deepest), var(--color-accent-deep));
		color: white;
		font-size: 24px;
		font-weight: 700;
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.15s;
		margin-bottom: 12px;
	}

	.btn-point:hover { background: linear-gradient(135deg, var(--color-accent-deep), var(--color-accent-dark)); }
	.btn-point:active { transform: scale(0.97); }
	.btn-point:disabled { opacity: 0.4; cursor: not-allowed; }

	.scoring-secondary { display: flex; gap: 8px; }
	.scoring-secondary .btn-action,
	.scoring-secondary .btn-service { flex: 1; text-align: center; }

	.timeout-banner {
		background: color-mix(in srgb, var(--color-warning) 15%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-warning) 50%, transparent);
		color: var(--color-warning);
		text-align: center;
		padding: 10px 20px;
		font-weight: 700;
		font-size: 16px;
		font-variant-numeric: tabular-nums;
	}

	.btn-timeout-cancel {
		margin-left: 16px;
		padding: 4px 12px;
		background: color-mix(in srgb, var(--color-error) 20%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-error) 50%, transparent);
		color: var(--color-error);
		border-radius: 6px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-timeout-cancel:hover { background: color-mix(in srgb, var(--color-error) 30%, transparent); border-color: var(--color-error); }

	.scoring-actions {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 16px 24px;
		border-top: 1px solid var(--color-border-default);
	}

	/* Buttons */
	.btn-action {
		padding: 10px 20px;
		border: 1px solid var(--color-accent-border);
		background: var(--color-bg-elevated);
		color: var(--color-accent);
		border-radius: 8px;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-action:hover { background: var(--color-bg-elevated-hover); border-color: var(--color-accent); }
	.btn-action:disabled { opacity: 0.4; cursor: not-allowed; }

	.btn-action-danger { border-color: color-mix(in srgb, var(--color-error) 30%, var(--color-bg-panel)); background: color-mix(in srgb, var(--color-error) 10%, var(--color-bg-panel)); color: var(--color-error-light); }
	.btn-action-danger:hover { background: color-mix(in srgb, var(--color-error) 20%, var(--color-bg-panel)); border-color: var(--color-error-light); }

	.btn-service {
		padding: 10px 16px;
		border: 1px solid var(--color-border-subtle);
		background: var(--color-bg-elevated);
		color: var(--color-text-secondary);
		border-radius: 8px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-service:hover:not(:disabled) { border-color: var(--color-accent); color: var(--color-accent); }

	.btn-service-active {
		background: linear-gradient(135deg, var(--color-accent-deepest), var(--color-accent-deep));
		border-color: var(--color-accent-mid);
		color: white;
		cursor: default;
	}

	/* Dialogs */
	.dialog {
		background: var(--color-bg-panel);
		color: var(--color-text-primary);
		border: 1px solid var(--color-border-default);
		border-radius: 12px;
		padding: 0;
		max-width: 480px;
		width: 90vw;
		margin: auto;
	}

	.dialog::backdrop { background: rgba(0, 0, 0, 0.6); }

	.dialog-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid var(--color-border-default);
	}

	.dialog-header h3 { margin: 0; font-size: 16px; font-weight: 700; }

	.dialog-close {
		background: none;
		border: none;
		color: var(--color-text-secondary);
		font-size: 24px;
		cursor: pointer;
		padding: 0;
		line-height: 1;
	}

	.dialog-close:hover { color: var(--color-text-primary); }

	.dialog-body {
		padding: 16px 20px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.advanced-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
	.advanced-team { display: flex; flex-direction: column; gap: 8px; padding: 0 12px; }
	.advanced-team:first-child { border-right: 1px solid var(--color-border-default); }
	.advanced-team-header { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
	.advanced-team .btn-action { width: 100%; text-align: center; }

	.dialog-footer {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		padding: 16px 20px;
		border-top: 1px solid var(--color-border-default);
	}

	/* Match finished */
	.match-finished {
		max-width: 1100px;
		margin: 16px auto 0;
		background: rgba(6, 78, 59, 0.3);
		border: 1px solid #065f46;
		border-radius: 12px;
		padding: 20px;
		text-align: center;
	}

	/* Timeline */
	.timeline-set { margin-bottom: 16px; }
	.timeline-set:last-child { margin-bottom: 0; }

	.timeline-set-header {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 8px;
		font-size: 14px;
		font-weight: 700;
		color: var(--color-text-secondary);
	}

	.timeline-final-score { font-variant-numeric: tabular-nums; color: var(--color-text-primary); }
	.timeline-winner-name { font-size: 12px; color: var(--color-text-tertiary); font-weight: 600; }
	.timeline-live-badge { background: color-mix(in srgb, var(--color-success) 20%, transparent); color: var(--color-success); padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
	.timeline-scroll { overflow-x: auto; padding-bottom: 4px; }
	.timeline-grid { display: flex; flex-direction: column; gap: 2px; }
	.timeline-row { display: flex; gap: 2px; }

	.timeline-cell {
		width: 30px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		font-weight: 700;
		font-family: monospace;
		font-variant-numeric: tabular-nums;
		border-radius: 3px;
		flex-shrink: 0;
	}

	.timeline-cell-home, .timeline-cell-guest { color: var(--color-text-primary); }
	.timeline-cell-dim { color: var(--color-border-subtle); background: var(--color-bg-dim); }
	.timeline-cell-timeout { background: color-mix(in srgb, var(--color-warning) 15%, transparent); color: var(--color-warning); font-size: 14px; }
	.timeline-cell-winner { border: 2px solid var(--color-warning); box-shadow: 0 0 6px color-mix(in srgb, var(--color-warning) 40%, transparent); }

	/* Utilities */
	.font-bold { font-weight: 700; }
	.text-xl { font-size: 20px; }
	.text-sm { font-size: 13px; }
	.text-gray-400 { color: var(--color-text-secondary); }
	.text-gray-300 { color: var(--color-text-secondary); }
	.flex { display: flex; }
	.items-center { align-items: center; }
	.justify-center { justify-content: center; }

	@media (max-width: 480px) {
		.control { padding: 8px; }
		.nav-bar { margin-bottom: 8px; }
		.card-header { padding: 10px 12px; }
		.card-body { padding: 10px 12px; }

		.scoreboard-preview { padding: 10px; }
		.scoreboard-preview:not(.with-jersey) {
			grid-template-columns: minmax(0, 1fr) 36px auto 40px auto;
		}
		.scoreboard-preview.with-jersey {
			grid-template-columns: 8px minmax(0, 1fr) 36px auto 40px auto;
		}
		.scoreboard-preview.with-jersey.has-logo {
			grid-template-columns: 36px minmax(0, 1fr) 36px auto 40px auto;
		}
		.preview-name { font-size: 13px; padding: 0 8px; }
		.preview-sets { width: 36px; font-size: 18px; }
		.preview-points { width: 40px; font-size: 20px; }
		.preview-set-scores.expanded { max-width: 140px; }
		.preview-set-cell { width: 28px; font-size: 14px; }

		.scoring-team { padding: 10px 12px; }
		.scoring-team-header { font-size: 13px; margin-bottom: 8px; overflow: hidden; }
		.scoring-team-header .font-bold { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
		.btn-point { height: 52px; font-size: 18px; margin-bottom: 8px; }

		.scoring-secondary { flex-direction: column; gap: 6px; }
		.btn-action { padding: 8px 12px; font-size: 12px; }
	}
</style>
