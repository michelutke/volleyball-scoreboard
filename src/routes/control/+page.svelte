<script lang="ts">
	import type { MatchState, Team } from '$lib/types.js';

	let { data } = $props();

	let match = $state<MatchState | null>(null);
	let matchTimeouts = $state({ home: 0, guest: 0 });
	let loading = $state(false);

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
			if (res.ok) match = updated;
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

	async function callTimeout(team: Team) {
		if (!match) return;
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

	let homeNameInput = $derived(match?.homeTeamName ?? '');
	let guestNameInput = $derived(match?.guestTeamName ?? '');
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
			<!-- Teamnamen Card -->
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

			<!-- Spielstand-Übersicht Card -->
			<div class="card">
				<div class="card-header">
					<span class="card-icon">&#9878;</span>
					<h2>Spielstand-Übersicht</h2>
				</div>
				<div class="card-body flex items-center justify-center">
					<div class="scoreboard-preview">
						<!-- Home Row -->
						<div class="preview-row">
							{#if match.showJerseyColors}
								<div class="preview-jersey" style:background-color={match.homeJerseyColor}></div>
							{/if}
							<div class="preview-name preview-name-dark">{match.homeTeamName.toUpperCase()}</div>
							<div class="preview-sets">{match.homeSets}</div>
							<div class="preview-points" style:background-color={match.homeJerseyColor}>{match.homePoints}</div>
						</div>
						<!-- Guest Row -->
						<div class="preview-row">
							{#if match.showJerseyColors}
								<div class="preview-jersey" style:background-color={match.guestJerseyColor}></div>
							{/if}
							<div class="preview-name">
								{#if match.serviceTeam === 'guest'}
									<img src="/volleyball.svg" alt="" class="preview-service" />
								{/if}
								{match.guestTeamName.toUpperCase()}
							</div>
							<div class="preview-sets">{match.guestSets}</div>
							<div class="preview-points" style:background-color={match.guestJerseyColor}>{match.guestPoints}</div>
						</div>
					</div>
				</div>

				{#if match.setScores.length > 0}
					<div class="set-scores">
						{#each match.setScores as s, i}
							<span class="set-badge">S{i + 1}: {s.home}-{s.guest}</span>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Trikotfarben Card -->
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

			<!-- Scoring Card (full width) -->
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
								<button onclick={() => removePoint('home')} disabled={loading} class="btn-score">
									&minus;
								</button>
								<button onclick={() => addPoint('home')} disabled={loading} class="btn-score btn-score-plus">
									+
								</button>
							</div>
						</div>

						<div class="scoring-section">
							<span class="scoring-label">Sätze</span>
							<div class="scoring-buttons">
								<button onclick={() => removeSet('home')} disabled={loading} class="btn-score btn-score-sm">
									&minus;
								</button>
								<button onclick={() => addSet('home')} disabled={loading} class="btn-score btn-score-sm btn-score-plus">
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
								<button onclick={() => addPoint('guest')} disabled={loading} class="btn-score btn-score-plus">
									+
								</button>
								<button onclick={() => removePoint('guest')} disabled={loading} class="btn-score">
									&minus;
								</button>
							</div>
						</div>

						<div class="scoring-section">
							<span class="scoring-label">Sätze</span>
							<div class="scoring-buttons">
								<button onclick={() => addSet('guest')} disabled={loading} class="btn-score btn-score-sm btn-score-plus">
									+
								</button>
								<button onclick={() => removeSet('guest')} disabled={loading} class="btn-score btn-score-sm">
									&minus;
								</button>
							</div>
						</div>
					</div>
				</div>

				<!-- Bottom Actions -->
				<div class="scoring-actions">
					<button onclick={switchService} class="btn-icon" title="Aufschlag wechseln">
						&#9898;
					</button>
					<button
						onclick={() => callTimeout('home')}
						disabled={matchTimeouts.home >= 2}
						class="btn-action"
					>
						&#9201; Auszeit
					</button>
					<button onclick={resetMatch} class="btn-action btn-action-danger">
						&#8635; Reset
					</button>
					<button
						onclick={() => callTimeout('guest')}
						disabled={matchTimeouts.guest >= 2}
						class="btn-action"
					>
						&#9201; Auszeit
					</button>
					<button onclick={switchService} class="btn-icon" title="Aufschlag wechseln">
						&#9898;
					</button>
				</div>
			</div>
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
		background: #0b0e1a;
		color: #e2e8f0;
		padding: 20px;
		font-family: system-ui, -apple-system, sans-serif;
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
		background: #111827;
		border: 1px solid #1e293b;
		border-radius: 12px;
		overflow: hidden;
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 14px 20px;
		border-bottom: 1px solid #1e293b;
		font-weight: 700;
		font-size: 16px;
	}

	.card-header h2 {
		margin: 0;
		font-size: 16px;
	}

	.card-icon {
		color: #38bdf8;
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
		color: #94a3b8;
	}

	.field-input {
		display: block;
		width: 100%;
		margin-top: 4px;
		padding: 10px 14px;
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 8px;
		color: white;
		font-size: 15px;
		outline: none;
		transition: border-color 0.2s;
	}

	.field-input:focus {
		border-color: #38bdf8;
	}

	/* Buttons */
	.btn-primary {
		padding: 10px 20px;
		background: linear-gradient(135deg, #0ea5e9, #0284c7);
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
		color: #94a3b8;
		font-weight: 400;
	}

	.toggle {
		position: relative;
		width: 44px;
		height: 24px;
		background: #334155;
		border: none;
		border-radius: 12px;
		cursor: pointer;
		transition: background 0.2s;
	}

	.toggle.active {
		background: #0ea5e9;
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
		color: #94a3b8;
	}

	/* Scoreboard Preview */
	.scoreboard-preview {
		display: flex;
		flex-direction: column;
		gap: 3px;
		padding: 20px;
		border: 1px solid #38bdf8;
		border-radius: 8px;
		box-shadow: 0 0 30px rgba(56, 189, 248, 0.15), 0 0 60px rgba(56, 189, 248, 0.05);
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
		opacity: 0.7;
		filter: invert(1);
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
		background: #1e293b;
		color: #94a3b8;
		padding: 4px 10px;
		border-radius: 6px;
		font-size: 12px;
		font-variant-numeric: tabular-nums;
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
		border-right: 1px solid #1e293b;
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
		color: #94a3b8;
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
		border: 2px solid #1e3a5f;
		background: #0c1929;
		color: #38bdf8;
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
		background: #132f4c;
		border-color: #38bdf8;
	}

	.btn-score:active {
		transform: scale(0.95);
	}

	.btn-score:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.btn-score-plus {
		background: linear-gradient(135deg, #0c4a6e, #0369a1);
		border-color: #0ea5e9;
	}

	.btn-score-plus:hover {
		background: linear-gradient(135deg, #0369a1, #0284c7);
	}

	.btn-score-sm {
		width: 60px;
		height: 44px;
		font-size: 22px;
	}

	/* Bottom Actions */
	.scoring-actions {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 16px 24px;
		border-top: 1px solid #1e293b;
	}

	.btn-icon {
		width: 40px;
		height: 40px;
		border: 1px solid #334155;
		background: transparent;
		color: #64748b;
		border-radius: 50%;
		cursor: pointer;
		font-size: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: border-color 0.2s;
	}

	.btn-icon:hover {
		border-color: #38bdf8;
		color: #38bdf8;
	}

	.btn-action {
		padding: 10px 20px;
		border: 1px solid #1e3a5f;
		background: #0c1929;
		color: #38bdf8;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-action:hover {
		background: #132f4c;
		border-color: #38bdf8;
	}

	.btn-action:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.btn-action-danger {
		border-color: #7f1d1d;
		background: #1c0a0a;
		color: #f87171;
	}

	.btn-action-danger:hover {
		background: #2d1111;
		border-color: #f87171;
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

	/* Utility */
	.w-full { width: 100%; }
	.font-bold { font-weight: 700; }
	.text-xl { font-size: 20px; }
	.text-sm { font-size: 13px; }
	.text-gray-400 { color: #94a3b8; }
	.text-gray-300 { color: #cbd5e1; }
	.flex { display: flex; }
	.items-center { align-items: center; }
	.justify-center { justify-content: center; }
</style>
