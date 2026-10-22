<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Logo from '$lib/components/brand/Logo.svelte';
	import ScoreboardPreview from '$lib/components/ScoreboardPreview.svelte';
	import type { MatchState, Team, SetTimeline, TimelineEvent } from '$lib/types.js';

	let { data } = $props();

	let match = $state<MatchState | null>(null);
	let matchTimeouts = $state({ home: 0, guest: 0 });
	let loading = $state(false);
	let activeTimeout = $state<{ team: Team; teamName: string; secondsLeft: number } | null>(null);
	let timeoutInterval: ReturnType<typeof setInterval> | null = null;

	$effect(() => {
		match = data.activeMatch;
		matchTimeouts = data.timeouts;
	});

	async function api(body: Record<string, unknown>) {
		loading = true;
		try {
			const res = await fetch('/api/match', {
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
		api({ matchId: match.matchId, action: 'addPoint', team });
	}

	function removePoint(team: Team) {
		if (!match) return;
		api({ matchId: match.matchId, action: 'removePoint', team });
	}

	function addSet(team: Team) {
		if (!match) return;
		api({ matchId: match.matchId, action: 'addSet', team });
	}

	function removeSet(team: Team) {
		if (!match) return;
		api({ matchId: match.matchId, action: 'removeSet', team });
	}

	function switchService() {
		if (!match) return;
		api({ matchId: match.matchId, action: 'switchService' });
	}

	function resetMatch() {
		if (!match) return;
		if (!confirm('Match wirklich zurücksetzen?')) return;
		api({ matchId: match.matchId, action: 'reset' });
	}

	function undo() {
		if (!match) return;
		api({ matchId: match.matchId, action: 'undo' });
	}

	async function callTimeout(team: Team) {
		if (!match || activeTimeout) return;
		const res = await fetch('/api/match/timeout', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ matchId: match.matchId, team })
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

	async function updateSettings(field: string, value: unknown) {
		if (!match) return;
		await api({ matchId: match.matchId, [field]: value });
	}

	async function createMatch() {
		const res = await fetch('/api/match', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({})
		});
		if (res.ok) {
			match = await res.json();
		}
	}

	async function cancelTimeout() {
		if (!match || !activeTimeout) return;
		if (!confirm('Auszeit falsch eingegeben?')) return;
		const res = await fetch('/api/match/timeout', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ matchId: match.matchId, team: activeTimeout.team })
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

	let homeNameInput = $derived(match?.homeTeamName ?? '');
	let guestNameInput = $derived(match?.guestTeamName ?? '');

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

				// Insert timeouts that occurred before this score row
				while (tIdx < setTimeouts.length && setTimeouts[tIdx].createdAt < curr.createdAt) {
					events.push({
						type: 'timeout',
						team: setTimeouts[tIdx].team as Team,
						homePoints: prev.homePoints,
						guestPoints: prev.guestPoints
					});
					tIdx++;
				}

				// Determine who scored
				if (curr.homePoints > prev.homePoints) {
					events.push({
						type: 'point',
						team: 'home',
						homePoints: curr.homePoints,
						guestPoints: curr.guestPoints
					});
				} else if (curr.guestPoints > prev.guestPoints) {
					events.push({
						type: 'point',
						team: 'guest',
						homePoints: curr.homePoints,
						guestPoints: curr.guestPoints
					});
				}
			}

			// Remaining timeouts after last score
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

			// Check if set is completed (exists in match setScores)
			const setScores = match?.setScores ?? [];
			const finalScore = setNum <= setScores.length ? setScores[setNum - 1] : null;

			// Add synthetic winning-point event (the winning point row has currentSet incremented + points reset)
			if (finalScore) {
				const winner: Team = finalScore.home > finalScore.guest ? 'home' : 'guest';
				events.push({
					type: 'point',
					team: winner,
					homePoints: finalScore.home,
					guestPoints: finalScore.guest
				});
			}

			timelines.push({ set: setNum, events, finalScore });
		}

		return timelines;
	});
</script>

<svelte:head>
	<title>Scoring Control</title>
</svelte:head>

<div class="control">
	<header class="bar">
		<Logo variant="mark" heavy class="bar-mark" />
		<span class="k-mono kicker">/ {(match?.homeTeamName ?? 'Scoring').toUpperCase()}</span>
		{#if match?.status === 'live'}
			<span class="live-badge k-pill"><span class="live-dot k-live-dot"></span>LIVE</span>
		{/if}
	</header>

	{#if !match}
		<div class="start-screen">
			<button onclick={createMatch} class="btn-primary text-xl py-4 px-10">
				Neues Match starten
			</button>
		</div>
	{:else}
		<div class="grid-layout">
			<!-- 1. Spielstand-Übersicht Card (full width) -->
			<div class="card col-span-full">
				<div class="card-header">
					<h2>Spielstand-Übersicht</h2>
					<label class="toggle-label">
						Satzresultate
						<button
							class="toggle"
							class:active={match.showSetScores}
							onclick={() => updateSettings('showSetScores', !match?.showSetScores)}
							aria-label="Satzresultate anzeigen"
						>
							<span class="toggle-knob"></span>
						</button>
					</label>
				</div>
				<div class="card-body flex items-center justify-center">
					{#if data.overlayDesign}
						<ScoreboardPreview
							{match}
							homeTimeoutsUsed={matchTimeouts.home}
							guestTimeoutsUsed={matchTimeouts.guest}
							timeoutTeam={activeTimeout?.team ?? null}
							customCode={data.overlayDesign.customCode}
							templateId={data.overlayDesign.templateId}
							layoutId={data.overlayDesign.scoreboardLayout}
							options={data.overlayDesign.scoreboardOptions}
						/>
					{/if}
				</div>

				{#if match.setScores.length > 0}
					<div class="set-scores">
						{#each match.setScores as s, i}
							<span class="set-badge" style:border-color={s.home > s.guest ? match.homeJerseyColor : match.guestJerseyColor}>S{i + 1}: {s.home}-{s.guest}</span>
						{/each}
					</div>
				{/if}

				<div class="timeout-info">
					<span class="timeout-info-team">
						{match.homeTeamName}: {matchTimeouts.home}/2 Auszeiten
					</span>
					<span class="timeout-info-team">
						{match.guestTeamName}: {matchTimeouts.guest}/2 Auszeiten
					</span>
				</div>
			</div>

			<!-- 2. Scoring Card (full width) -->
			<div class="card col-span-full">
				<div class="scoring-grid">
					<!-- Home Side -->
					<div class="scoring-team">
						<div class="scoring-team-header">
							<span class="font-bold">{match.homeTeamName}</span>
							{#if match.serviceTeam === 'home'}<span class="serve-dot" aria-label="Aufschlag"></span>{/if}
						</div>
						<div class="points k-mono">{match.homePoints}</div>
						<div class="team-meta k-mono">
							<span>SETS {match.homeSets}</span>
							<span class="to">TO
								<span class="to-dot" class:used={matchTimeouts.home >= 1}></span>
								<span class="to-dot" class:used={matchTimeouts.home >= 2}></span>
							</span>
						</div>

						<div class="scoring-section">
							<span class="scoring-label">Punkte</span>
							<div class="scoring-buttons">
								<button onclick={() => removePoint('home')} disabled={loading || !!activeTimeout} class="btn-score">
									&minus;
								</button>
								<button onclick={() => addPoint('home')} disabled={loading || !!activeTimeout} class="btn-score btn-score-plus">
									+
								</button>
							</div>
						</div>

						<div class="scoring-section">
							<span class="scoring-label">Sätze</span>
							<div class="scoring-buttons">
								<button onclick={() => removeSet('home')} disabled={loading || !!activeTimeout} class="btn-score btn-score-sm">
									&minus;
								</button>
								<button onclick={() => addSet('home')} disabled={loading || !!activeTimeout} class="btn-score btn-score-sm btn-score-plus">
									+
								</button>
							</div>
						</div>
					</div>

					<!-- Guest Side -->
					<div class="scoring-team">
						<div class="scoring-team-header">
							<span class="font-bold">{match.guestTeamName}</span>
							{#if match.serviceTeam === 'guest'}<span class="serve-dot" aria-label="Aufschlag"></span>{/if}
						</div>
						<div class="points k-mono">{match.guestPoints}</div>
						<div class="team-meta k-mono">
							<span>SETS {match.guestSets}</span>
							<span class="to">TO
								<span class="to-dot" class:used={matchTimeouts.guest >= 1}></span>
								<span class="to-dot" class:used={matchTimeouts.guest >= 2}></span>
							</span>
						</div>

						<div class="scoring-section">
							<span class="scoring-label">Punkte</span>
							<div class="scoring-buttons">
								<button onclick={() => addPoint('guest')} disabled={loading || !!activeTimeout} class="btn-score btn-score-plus">
									+
								</button>
								<button onclick={() => removePoint('guest')} disabled={loading || !!activeTimeout} class="btn-score">
									&minus;
								</button>
							</div>
						</div>

						<div class="scoring-section">
							<span class="scoring-label">Sätze</span>
							<div class="scoring-buttons">
								<button onclick={() => addSet('guest')} disabled={loading || !!activeTimeout} class="btn-score btn-score-sm btn-score-plus">
									+
								</button>
								<button onclick={() => removeSet('guest')} disabled={loading || !!activeTimeout} class="btn-score btn-score-sm">
									&minus;
								</button>
							</div>
						</div>
					</div>
				</div>

				{#if activeTimeout}
					<div class="timeout-banner">
						Auszeit {activeTimeout.teamName}: {activeTimeout.secondsLeft}s
						<button onclick={cancelTimeout} class="btn-timeout-cancel">Abbrechen</button>
					</div>
				{/if}

				<!-- Bottom Actions -->
				<div class="scoring-actions">
					<button
						onclick={() => { if (match?.serviceTeam !== 'home') switchService(); }}
						class="btn-service"
						class:btn-service-active={match?.serviceTeam === 'home'}
						disabled={match?.serviceTeam === 'home'}
					>
						{match?.homeTeamName}
					</button>
					<button
						onclick={() => callTimeout('home')}
						disabled={matchTimeouts.home >= 2 || !!activeTimeout}
						class="btn-action"
					>
						Timeout
					</button>
					<button onclick={undo} disabled={loading} class="btn-action">
						Rückgängig
					</button>
					<button onclick={resetMatch} class="btn-action btn-action-danger">
						Reset
					</button>
					<button
						onclick={() => callTimeout('guest')}
						disabled={matchTimeouts.guest >= 2 || !!activeTimeout}
						class="btn-action"
					>
						Timeout
					</button>
					<button
						onclick={() => { if (match?.serviceTeam !== 'guest') switchService(); }}
						class="btn-service"
						class:btn-service-active={match?.serviceTeam === 'guest'}
						disabled={match?.serviceTeam === 'guest'}
					>
						{match?.guestTeamName}
					</button>
				</div>
			</div>

			<!-- 3. Teamnamen Card -->
			<div class="card">
				<div class="card-header">
					<h2>Teamnamen</h2>
				</div>
				<div class="card-body">
					<label class="field-label">
						Heimteam
						<input
							type="text"
							value={homeNameInput}
							onchange={(e) => updateSettings('homeTeamName', e.currentTarget.value)}
							class="field-input"
						/>
					</label>
					<label class="field-label">
						Gastteam
						<input
							type="text"
							value={guestNameInput}
							onchange={(e) => updateSettings('guestTeamName', e.currentTarget.value)}
							class="field-input"
						/>
					</label>
					<button
						onclick={() => { updateSettings('homeTeamName', homeNameInput); updateSettings('guestTeamName', guestNameInput); }}
						class="btn-primary w-full"
					>
						Aktualisieren
					</button>
				</div>
			</div>

			<!-- 4. Trikotfarben Card -->
			<div class="card">
				<div class="card-header">
					<h2>Trikotfarben</h2>
					<label class="toggle-label">
						Sichtbar
						<button
							class="toggle"
							class:active={match.showJerseyColors}
							onclick={() => updateSettings('showJerseyColors', !match?.showJerseyColors)}
							aria-label="Trikotfarben sichtbar"
						>
							<span class="toggle-knob"></span>
						</button>
					</label>
				</div>
				<div class="card-body">
					<div class="color-field">
						<span class="text-sm text-gray-400">Heim-Trikot</span>
						<div class="color-row">
							<input
								type="color"
								value={match.homeJerseyColor}
								onchange={(e) => updateSettings('homeJerseyColor', e.currentTarget.value)}
								class="color-picker"
							/>
							<span class="color-hex">{match.homeJerseyColor}</span>
						</div>
					</div>
					<div class="color-field">
						<span class="text-sm text-gray-400">Gast-Trikot</span>
						<div class="color-row">
							<input
								type="color"
								value={match.guestJerseyColor}
								onchange={(e) => updateSettings('guestJerseyColor', e.currentTarget.value)}
								class="color-picker"
							/>
							<span class="color-hex">{match.guestJerseyColor}</span>
						</div>
					</div>
				</div>
			</div>

			<!-- 5. Spielverlauf Card (full width) -->
			{#if setTimelines.length > 0}
				<div class="card col-span-full">
					<div class="card-header">
						<h2>Spielverlauf</h2>
					</div>
					<div class="card-body">
						{#each setTimelines.toReversed() as timeline (timeline.set)}
							{#each timeline.events.toReversed() as evt}
								<div class="history-row k-mono">
									<span class="history-set">S{timeline.set}</span>
									<span class="history-score">{evt.type === 'point' ? `${evt.homePoints}:${evt.guestPoints}` : 'TO'}</span>
									<span class="history-team">{evt.type === 'timeout' ? 'TIMEOUT ' : ''}{evt.team === 'home' ? match?.homeTeamName : match?.guestTeamName}</span>
								</div>
							{/each}
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
	{/if}
</div>

<style>
	.control {
		min-height: 100vh;
		background: var(--k-surface);
		color: var(--k-text);
		padding: 20px;
		font-family: var(--font-sans);
	}

	.bar {
		display: flex;
		align-items: center;
		gap: 12px;
		max-width: 1100px;
		margin: 0 auto 12px;
	}

	:global(.bar-mark) { height: 24px; width: auto; flex-shrink: 0; color: var(--k-text); }

	.kicker {
		margin: 0;
		font-size: 11px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--k-text-dim);
	}

	.live-badge {
		margin-left: auto;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		background: var(--pulse);
		color: var(--ink);
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: var(--type-wght-bold);
		letter-spacing: 0.08em;
	}

	.live-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--paper); }

	.serve-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--pulse); flex-shrink: 0; }

	.points {
		font-size: 96px;
		line-height: 1;
		font-weight: var(--type-wght-bold);
		letter-spacing: -0.04em;
		padding: 4px 0 12px;
		border-bottom: 1px solid var(--k-line);
	}

	.team-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin: 8px 0 16px;
		font-size: 10px;
		letter-spacing: 0.08em;
		color: var(--k-text-dim);
	}

	.to { display: inline-flex; align-items: center; gap: 4px; }
	.to-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--k-text); border: 1px solid var(--k-text); }
	.to-dot.used { background: transparent; border-color: var(--k-text-dim); }

	.history-row {
		display: grid;
		grid-template-columns: 36px 64px 1fr;
		gap: 8px;
		padding: 8px 0;
		border-bottom: 1px solid var(--k-line);
		font-size: 12px;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--k-text-mute);
	}

	.history-set { color: var(--k-text-dim); }
	.history-score { color: var(--k-text); font-weight: var(--type-wght-bold); }
	.history-team { text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

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
		background: var(--k-surface-alt);
		border: 1px solid var(--k-line);
		border-radius: 0;
		overflow: hidden;
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 14px 20px;
		border-bottom: 1px solid var(--k-line);
		font-weight: var(--type-wght-bold);
		font-size: 15px;
	}

	.card-header h2 { margin: 0; font-size: 15px; letter-spacing: -0.01em; }

	.card-body {
		padding: 16px 20px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.field-label {
		display: block;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--k-text-mute);
	}

	.field-input {
		display: block;
		width: 100%;
		margin-top: 6px;
		padding: 10px 12px;
		background: var(--k-surface);
		border: 1px solid var(--k-line);
		border-radius: 0;
		color: var(--k-text);
		font-size: 14px;
		outline: none;
		transition: border-color var(--dur-fast) var(--ease-snap);
	}

	.field-input:focus { border-color: var(--color-focus); }

	.btn-primary {
		padding: 10px 20px;
		background: var(--k-text);
		color: var(--k-surface);
		border: 1px solid var(--k-text);
		border-radius: 0;
		font-weight: var(--type-wght-bold);
		font-size: 14px;
		cursor: pointer;
		transition: background var(--dur-fast) var(--ease-snap);
		text-align: center;
	}

	.btn-primary:hover { background: var(--k-text-mute); border-color: var(--k-text-mute); }

	.toggle-label {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		color: var(--k-text-mute);
		font-weight: 400;
	}

	.toggle {
		position: relative;
		width: 44px;
		height: 24px;
		background: var(--k-line);
		border: none;
		border-radius: 0;
		cursor: pointer;
		transition: background var(--dur-fast) var(--ease-snap);
	}

	.toggle.active { background: var(--k-text); }

	.toggle-knob {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 20px;
		height: 20px;
		background: var(--k-surface);
		transition: transform var(--dur-fast) var(--ease-snap);
	}

	.toggle.active .toggle-knob { transform: translateX(20px); }

	.color-field { display: flex; flex-direction: column; gap: 6px; }
	.color-row { display: flex; align-items: center; gap: 10px; }
	.color-picker { width: 40px; height: 40px; border: none; border-radius: 0; cursor: pointer; padding: 0; }
	.color-hex { font-family: var(--font-mono); font-size: 13px; color: var(--k-text-mute); }

	.set-scores { display: flex; justify-content: center; gap: 8px; padding: 0 20px 16px; }

	.set-badge {
		background: var(--k-surface);
		color: var(--k-text-mute);
		padding: 4px 10px;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.06em;
		font-variant-numeric: tabular-nums;
		border: 2px solid transparent;
	}

	.timeout-info {
		display: flex;
		justify-content: center;
		gap: 24px;
		padding: 8px 20px 16px;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.06em;
		color: var(--k-text-mute);
		font-variant-numeric: tabular-nums;
	}

	.timeout-info-team { background: var(--k-surface); padding: 4px 12px; border: 1px solid var(--k-line); }

	.scoring-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
	.scoring-team { padding: 20px 24px; }
	.scoring-team:first-child { border-right: 1px solid var(--k-line); }

	.scoring-team-header {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 8px;
		font-weight: var(--type-wght-display);
		font-size: 13px;
		letter-spacing: 0.02em;
		text-transform: uppercase;
	}

	.scoring-section { margin-bottom: 16px; }

	.scoring-label {
		display: block;
		text-align: center;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--k-text-dim);
		margin-bottom: 8px;
	}

	.scoring-buttons { display: flex; gap: 8px; justify-content: center; }

	.btn-score {
		width: 72px;
		height: 56px;
		border: 1px solid var(--k-line);
		background: transparent;
		color: var(--k-text);
		font-size: 28px;
		font-weight: var(--type-wght-bold);
		border-radius: 0;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.btn-score:hover { border-color: var(--k-text); }
	.btn-score:disabled { opacity: 0.4; cursor: not-allowed; }

	.btn-score-plus { background: var(--k-text); border-color: var(--k-text); color: var(--k-surface); }
	.btn-score-plus:hover { background: var(--k-text-mute); border-color: var(--k-text-mute); }

	.btn-score-sm { width: 60px; height: 44px; font-size: 22px; }

	.btn-score,
	.btn-action,
	.btn-service {
		transition: transform var(--dur-mid) var(--ease-glide), border-color var(--dur-fast) var(--ease-snap), background var(--dur-fast) var(--ease-snap);
	}

	.btn-score:active:not(:disabled),
	.btn-action:active:not(:disabled),
	.btn-service:active:not(:disabled) {
		transform: scale(0.94);
		transition-duration: var(--dur-fast);
		transition-timing-function: var(--ease-snap);
	}

	.timeout-banner {
		background: color-mix(in srgb, var(--color-warning) 15%, transparent);
		border-top: 1px solid color-mix(in srgb, var(--color-warning) 40%, transparent);
		border-bottom: 1px solid color-mix(in srgb, var(--color-warning) 40%, transparent);
		color: var(--color-warning);
		text-align: center;
		padding: 10px 20px;
		font-weight: var(--type-wght-bold);
		font-size: 14px;
		font-variant-numeric: tabular-nums;
	}

	.btn-timeout-cancel {
		margin-left: 16px;
		padding: 4px 12px;
		background: transparent;
		border: 1px solid color-mix(in srgb, var(--color-error) 50%, transparent);
		color: var(--color-error);
		border-radius: 0;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-weight: 600;
		cursor: pointer;
	}

	.btn-timeout-cancel:hover { background: color-mix(in srgb, var(--color-error) 15%, transparent); border-color: var(--color-error); }

	.scoring-actions {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 16px 24px;
		border-top: 1px solid var(--k-line);
		flex-wrap: wrap;
	}

	.btn-service {
		padding: 9px 16px;
		border: 1px solid var(--k-line);
		background: transparent;
		color: var(--k-text-mute);
		border-radius: 0;
		font-size: 13px;
		font-weight: var(--type-wght-medium);
		cursor: pointer;
	}

	.btn-service:hover:not(:disabled) { border-color: var(--k-text); color: var(--k-text); }

	.btn-service-active { background: var(--k-text); border-color: var(--k-text); color: var(--k-surface); cursor: default; }

	.btn-action {
		padding: 9px 18px;
		border: 1px solid var(--k-line);
		background: transparent;
		color: var(--k-text);
		border-radius: 0;
		font-size: 13px;
		font-weight: var(--type-wght-medium);
		cursor: pointer;
	}

	.btn-action:hover:not(:disabled) { border-color: var(--k-text); }
	.btn-action:disabled { opacity: 0.4; cursor: not-allowed; }

	.btn-action-danger { border-color: color-mix(in srgb, var(--color-error) 40%, transparent); color: var(--color-error); }
	.btn-action-danger:hover:not(:disabled) { background: color-mix(in srgb, var(--color-error) 12%, transparent); border-color: var(--color-error); }

	.match-finished {
		max-width: 1100px;
		margin: 16px auto 0;
		border: 1px solid var(--k-text);
		padding: 20px;
		text-align: center;
	}

	.w-full { width: 100%; }
	.font-bold { font-weight: 700; }
	.text-xl { font-size: 20px; }
	.text-sm { font-size: 13px; }
	.text-gray-400 { color: var(--k-text-mute); }
	.text-gray-300 { color: var(--k-text-mute); }
	.flex { display: flex; }
	.items-center { align-items: center; }
	.justify-center { justify-content: center; }

	@media (max-width: 480px) {
		.control { padding: 8px; }
		.card-header { padding: 10px 12px; }
		.card-body { padding: 10px 12px; }
		.scoring-team { padding: 10px 12px; }
		.scoring-team-header { overflow: hidden; }
		.scoring-team-header .font-bold { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
		.btn-score { width: 60px; }
		.scoring-actions { padding: 10px 12px; gap: 8px; }
	}
</style>
