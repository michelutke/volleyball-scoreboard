<script lang="ts">
	import { invalidateAll } from '$app/navigation';
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
					<span class="card-icon">&#9878;</span>
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
					<div class="scoreboard-preview">
						<!-- Home Row -->
						<div class="preview-row">
							{#if match.showJerseyColors}
								<div class="preview-jersey" style:background-color={match.homeJerseyColor}></div>
							{/if}
							<div class="preview-name preview-name-dark">
								{match.homeTeamName.toUpperCase()}
								<img
									src="/vbcthun-ball.svg"
									alt=""
									class="preview-service"
									class:preview-service-hidden={match.serviceTeam !== 'home'}
								/>
							</div>
							<div class="preview-sets">{match.homeSets}</div>
							<div class="preview-set-scores" class:expanded={setScoresExpanded}>
								{#each match.setScores as s}
									<div class="preview-set-cell" class:preview-set-cell-winner={s.home > s.guest} style:--winner-color={match.homeJerseyColor}>{s.home}</div>
								{/each}
							</div>
							<div class="preview-points" style:background-color={match.homeJerseyColor}>{match.homePoints}</div>
						</div>
						<!-- Guest Row -->
						<div class="preview-row">
							{#if match.showJerseyColors}
								<div class="preview-jersey" style:background-color={match.guestJerseyColor}></div>
							{/if}
							<div class="preview-name">
								{match.guestTeamName.toUpperCase()}
								<img
									src="/vbcthun-ball.svg"
									alt=""
									class="preview-service"
									class:preview-service-hidden={match.serviceTeam !== 'guest'}
								/>
							</div>
							<div class="preview-sets">{match.guestSets}</div>
							<div class="preview-set-scores" class:expanded={setScoresExpanded}>
								{#each match.setScores as s}
									<div class="preview-set-cell" class:preview-set-cell-winner={s.guest > s.home} style:--winner-color={match.guestJerseyColor}>{s.guest}</div>
								{/each}
							</div>
							<div class="preview-points" style:background-color={match.guestJerseyColor}>{match.guestPoints}</div>
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
							<span class="scoring-team-icon">&#9675;</span>
							<span class="font-bold">{match.homeTeamName}</span>
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
							<span class="scoring-team-icon">&#128101;</span>
							<span class="font-bold">{match.guestTeamName}</span>
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
						Auszeit {activeTimeout.teamName} — {activeTimeout.secondsLeft}s
						<button onclick={cancelTimeout} class="btn-timeout-cancel">&#10005; Abbrechen</button>
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
						&#127952; {match?.homeTeamName}
					</button>
					<button
						onclick={() => callTimeout('home')}
						disabled={matchTimeouts.home >= 2 || !!activeTimeout}
						class="btn-action"
					>
						&#9201; Auszeit
					</button>
					<button onclick={undo} disabled={loading} class="btn-action">
						&#8617; Zurueck
					</button>
					<button onclick={resetMatch} class="btn-action btn-action-danger">
						&#8635; Reset
					</button>
					<button
						onclick={() => callTimeout('guest')}
						disabled={matchTimeouts.guest >= 2 || !!activeTimeout}
						class="btn-action"
					>
						&#9201; Auszeit
					</button>
					<button
						onclick={() => { if (match?.serviceTeam !== 'guest') switchService(); }}
						class="btn-service"
						class:btn-service-active={match?.serviceTeam === 'guest'}
						disabled={match?.serviceTeam === 'guest'}
					>
						&#127952; {match?.guestTeamName}
					</button>
				</div>
			</div>

			<!-- 3. Teamnamen Card -->
			<div class="card">
				<div class="card-header">
					<span class="card-icon">T</span>
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
						&#128190; Aktualisieren
					</button>
				</div>
			</div>

			<!-- 4. Trikotfarben Card -->
			<div class="card">
				<div class="card-header">
					<span class="card-icon">&#9898;</span>
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
										<!-- Home row -->
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
										<!-- Guest row -->
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

	.start-screen {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 80vh;
	}

	/* Grid Layout */
	.grid-layout {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
		max-width: 1100px;
		margin: 0 auto;
	}

	.col-span-full {
		grid-column: 1 / -1;
	}

	/* Card */
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

	.card-header h2 {
		margin: 0;
		font-size: 16px;
	}

	.card-icon {
		color: var(--color-accent);
		font-size: 18px;
	}

	.card-body {
		padding: 16px 20px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	/* Fields */
	.field-label {
		display: block;
		font-size: 13px;
		color: var(--color-text-secondary);
	}

	.field-input {
		display: block;
		width: 100%;
		margin-top: 4px;
		padding: 10px 14px;
		background: var(--color-bg-input);
		border: 1px solid var(--color-border-subtle);
		border-radius: 8px;
		color: var(--color-text-primary);
		font-size: 15px;
		outline: none;
		transition: border-color 0.2s;
	}

	.field-input:focus {
		border-color: var(--color-accent);
	}

	/* Buttons */
	.btn-primary {
		padding: 10px 20px;
		background: linear-gradient(135deg, var(--color-accent-mid), var(--color-accent-dark));
		color: white;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		font-size: 14px;
		cursor: pointer;
		transition: opacity 0.2s;
		text-align: center;
	}

	.btn-primary:hover {
		opacity: 0.9;
	}

	/* Toggle */
	.toggle-label {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		color: var(--color-text-secondary);
		font-weight: 400;
	}

	.toggle {
		position: relative;
		width: 44px;
		height: 24px;
		background: var(--color-border-subtle);
		border: none;
		border-radius: 12px;
		cursor: pointer;
		transition: background 0.2s;
	}

	.toggle.active {
		background: var(--color-accent-mid);
	}

	.toggle-knob {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 20px;
		height: 20px;
		background: white;
		border-radius: 50%;
		transition: transform 0.2s;
	}

	.toggle.active .toggle-knob {
		transform: translateX(20px);
	}

	/* Color Picker */
	.color-field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.color-row {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.color-picker {
		width: 40px;
		height: 40px;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		padding: 0;
	}

	.color-hex {
		font-family: monospace;
		font-size: 14px;
		color: var(--color-text-secondary);
	}

	/* Scoreboard Preview */
	.scoreboard-preview {
		display: flex;
		flex-direction: column;
		gap: 3px;
		padding: 20px;
		border: 1px solid var(--color-accent);
		border-radius: 8px;
		box-shadow: 0 0 30px color-mix(in srgb, var(--color-accent) 15%, transparent), 0 0 60px color-mix(in srgb, var(--color-accent) 5%, transparent);
	}

	.preview-row {
		display: flex;
		align-items: stretch;
		height: 48px;
	}

	.preview-jersey {
		width: 8px;
		flex-shrink: 0;
	}

	.preview-name {
		background: #1a1a1a;
		color: white;
		padding: 0 16px;
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 160px;
		font-size: 18px;
		font-weight: 800;
	}

	.preview-name-dark {
		background: #0a0a0a;
	}

	.preview-service {
		width: 20px;
		height: 20px;
		opacity: 0.85;
		margin-left: auto;
	}

	.preview-service-hidden {
		visibility: hidden;
	}

	.preview-sets {
		background: #1a1a1a;
		color: white;
		width: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 22px;
		font-weight: 800;
		border-left: 2px solid #2a2a2a;
		font-variant-numeric: tabular-nums;
	}

	.preview-points {
		color: white;
		width: 52px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 26px;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
	}

	.set-scores {
		display: flex;
		justify-content: center;
		gap: 8px;
		padding: 0 20px 16px;
	}

	.set-badge {
		background: var(--color-bg-input);
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

	.timeout-info-team {
		background: var(--color-bg-input);
		padding: 4px 12px;
		border-radius: 6px;
	}

	/* Scoring Section */
	.scoring-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0;
	}

	.scoring-team {
		padding: 20px 24px;
	}

	.scoring-team:first-child {
		border-right: 1px solid var(--color-border-default);
	}

	.scoring-team-header {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 20px;
		font-size: 16px;
	}

	.scoring-team-icon {
		font-size: 18px;
	}

	.scoring-section {
		margin-bottom: 16px;
	}

	.scoring-label {
		display: block;
		text-align: center;
		font-size: 13px;
		color: var(--color-text-secondary);
		margin-bottom: 8px;
	}

	.scoring-buttons {
		display: flex;
		gap: 8px;
		justify-content: center;
	}

	.btn-score {
		width: 72px;
		height: 56px;
		border: 2px solid var(--color-accent-border);
		background: var(--color-bg-elevated);
		color: var(--color-accent);
		font-size: 28px;
		font-weight: 700;
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.15s;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.btn-score:hover {
		background: var(--color-bg-elevated-hover);
		border-color: var(--color-accent);
	}

	.btn-score:active {
		transform: scale(0.95);
	}

	.btn-score:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.btn-score-plus {
		background: linear-gradient(135deg, var(--color-accent-deepest), var(--color-accent-deep));
		border-color: var(--color-accent-mid);
	}

	.btn-score-plus:hover {
		background: linear-gradient(135deg, var(--color-accent-deep), var(--color-accent-dark));
	}

	.btn-score-sm {
		width: 60px;
		height: 44px;
		font-size: 22px;
	}

	.timeout-banner {
		background: rgba(234, 179, 8, 0.15);
		border: 1px solid rgba(234, 179, 8, 0.5);
		color: var(--color-warning);
		text-align: center;
		padding: 10px 20px;
		font-weight: 700;
		font-size: 16px;
		font-variant-numeric: tabular-nums;
	}

	/* Bottom Actions */
	.scoring-actions {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 16px 24px;
		border-top: 1px solid var(--color-border-default);
	}

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

	.btn-service:hover:not(:disabled) {
		border-color: var(--color-accent);
		color: var(--color-accent);
	}

	.btn-service-active {
		background: linear-gradient(135deg, var(--color-accent-deepest), var(--color-accent-deep));
		border-color: var(--color-accent-mid);
		color: white;
		cursor: default;
	}

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

	.btn-action:hover {
		background: var(--color-bg-elevated-hover);
		border-color: var(--color-accent);
	}

	.btn-action:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.btn-action-danger {
		border-color: color-mix(in srgb, var(--color-error) 30%, var(--color-bg-panel));
		background: color-mix(in srgb, var(--color-error) 10%, var(--color-bg-panel));
		color: var(--color-error-light);
	}

	.btn-action-danger:hover {
		background: color-mix(in srgb, var(--color-error) 20%, var(--color-bg-panel));
		border-color: var(--color-error-light);
	}

	.preview-set-scores {
		display: flex;
		align-items: stretch;
		max-width: 0;
		overflow: hidden;
		opacity: 0;
		transition: max-width 0.4s ease, opacity 0.3s ease;
	}

	.preview-set-scores.expanded {
		max-width: 300px;
		opacity: 1;
	}

	.preview-set-cell {
		background: #1a1a1a;
		color: var(--color-text-secondary);
		width: 38px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 18px;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		border-left: 1px solid #2a2a2a;
		border-bottom: 2px solid transparent;
	}

	.preview-set-cell-winner {
		border-bottom-color: var(--winner-color);
		color: var(--color-text-primary);
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

	.btn-timeout-cancel:hover {
		background: color-mix(in srgb, var(--color-error) 30%, transparent);
		border-color: var(--color-error);
	}

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
	.timeline-set {
		margin-bottom: 16px;
	}

	.timeline-set:last-child {
		margin-bottom: 0;
	}

	.timeline-set-header {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 8px;
		font-size: 14px;
		font-weight: 700;
		color: var(--color-text-secondary);
	}

	.timeline-final-score {
		font-variant-numeric: tabular-nums;
		color: var(--color-text-primary);
	}

	.timeline-winner-name {
		font-size: 12px;
		color: var(--color-text-tertiary);
		font-weight: 600;
	}

	.timeline-live-badge {
		background: rgba(34, 197, 94, 0.2);
		color: var(--color-success);
		padding: 2px 8px;
		border-radius: 4px;
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
	}

	.timeline-scroll {
		overflow-x: auto;
		padding-bottom: 4px;
	}

	.timeline-grid {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.timeline-row {
		display: flex;
		gap: 2px;
	}

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

	.timeline-cell-home,
	.timeline-cell-guest {
		color: var(--color-text-primary);
	}

	.timeline-cell-dim {
		color: var(--color-border-subtle);
		background: var(--color-bg-dim);
	}

	.timeline-cell-timeout {
		background: rgba(234, 179, 8, 0.15);
		color: var(--color-warning);
		font-size: 14px;
	}

	.timeline-cell-winner {
		border: 2px solid var(--color-warning);
		box-shadow: 0 0 6px rgba(234, 179, 8, 0.4);
	}

	/* Utility */
	.w-full { width: 100%; }
	.font-bold { font-weight: 700; }
	.text-xl { font-size: 20px; }
	.text-sm { font-size: 13px; }
	.text-gray-400 { color: var(--color-text-secondary); }
	.text-gray-300 { color: var(--color-text-secondary); }
	.flex { display: flex; }
	.items-center { align-items: center; }
	.justify-center { justify-content: center; }
</style>
