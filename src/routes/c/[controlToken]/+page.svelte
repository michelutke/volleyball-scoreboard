<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import Logo from '$lib/components/brand/Logo.svelte';
	import Pattern from '$lib/components/brand/Pattern.svelte';
	import ScoreboardPreview from '$lib/components/ScoreboardPreview.svelte';
	import { applyScoreAction, type ScoreHistoryRow } from '$lib/score-history.js';
	import type { MatchState, Team, SetTimeline, TimelineEvent } from '$lib/types.js';

	let { data } = $props();

	const controlToken = $derived(data.controlToken);
	const shareUrl = $derived(`${page.url.host}/c/${data.controlToken}`);
	let match = $state<MatchState | null>(null);
	let matchTimeouts = $state({ home: 0, guest: 0 });
	// Kept locally after score actions so a point redraws only what changed, see applyScoreAction.
	let scoreHistory = $state<ScoreHistoryRow[]>([]);
	let loading = $state(false);
	let activeTimeout = $state<{ team: Team; teamName: string; secondsLeft: number } | null>(null);
	let timeoutInterval: ReturnType<typeof setInterval> | null = null;

	// Dialog state
	let advancedOpen = $state(false);
	let advancedDialogEl = $state<HTMLDialogElement | null>(null);

	$effect(() => {
		match = data.activeMatch;
		matchTimeouts = data.timeouts;
		scoreHistory = data.scoreHistory;
	});

	$effect(() => {
		if (advancedDialogEl) {
			if (advancedOpen) advancedDialogEl.showModal();
			else advancedDialogEl.close();
		}
	});

	// Link expired, replaced, or match not started: reload so the load error shows the matching page.
	async function reloadIfUnavailable(res: Response) {
		if (res.status === 404 || res.status === 409 || res.status === 410) await invalidateAll();
	}

	async function api(body: Record<string, unknown>) {
		if (loading) return;
		loading = true;
		try {
			const res = await fetch(`/api/c/${controlToken}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			const updated = await res.json();
			if (res.ok) {
				const previous = match;
				match = updated;
				const history =
					typeof body.action === 'string' && previous
						? applyScoreAction(scoreHistory, data.timeoutHistory, body.action, previous, updated)
						: null;
				if (history) scoreHistory = history;
				else invalidateAll();
			} else {
				await reloadIfUnavailable(res);
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
		} else {
			await reloadIfUnavailable(res);
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
		} else {
			await reloadIfUnavailable(res);
		}
	}

	let setTimelines = $derived.by((): SetTimeline[] => {
		const history = scoreHistory;
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
	<title>Geteilter Scoring-Zugriff</title>
</svelte:head>

<div class="control">
	<header class="bar">
		<div class="bar-id">
			<Logo variant="mark" heavy class="bar-mark" />
			<span class="k-mono kicker">GETEILTER SCORING-ZUGRIFF</span>
		</div>
		{#if match?.status === 'live'}
			<span class="live-badge k-pill"><span class="live-dot k-live-dot"></span>LIVE</span>
		{/if}
	</header>

	{#if !match}
		<div class="start-screen">
			<p class="text-mute">Match nicht gefunden</p>
		</div>
	{:else}
		<main class="tool">
			<p class="k-mono kicker">{match.homeTeamName} VS {match.guestTeamName}, KEIN KONTO NÖTIG</p>

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

			<div class="teams">
				{#each [{ team: 'home', name: match.homeTeamName, points: match.homePoints, sets: match.homeSets }, { team: 'guest', name: match.guestTeamName, points: match.guestPoints, sets: match.guestSets }] as const as t (t.team)}
					<div class="team">
						<div class="team-name">
							<span>{t.name}</span>
							{#if match.serviceTeam === t.team}<span class="serve-dot" aria-label="Aufschlag"></span>{/if}
						</div>
						<div class="points k-mono">{t.points}</div>
						<div class="team-meta k-mono">
							<span>SETS {t.sets}</span>
							<span class="to">TO
								<span class="to-dot" class:used={matchTimeouts[t.team] >= 1}></span>
								<span class="to-dot" class:used={matchTimeouts[t.team] >= 2}></span>
							</span>
						</div>
						<button onclick={() => addPoint(t.team)} disabled={!!activeTimeout} class="btn-point">+ Punkt</button>
						<button onclick={() => removePoint(t.team)} disabled={!!activeTimeout} class="btn-action">&minus; Punkt</button>
						<button onclick={() => callTimeout(t.team)} disabled={matchTimeouts[t.team] >= 2 || !!activeTimeout} class="btn-action">Timeout</button>
						<button onclick={() => { if (match?.serviceTeam !== t.team) switchService(); }} disabled={match?.serviceTeam === t.team} class="btn-action" aria-pressed={match?.serviceTeam === t.team}>Aufschlag</button>
						{#if t.team === 'home'}
							<button onclick={undo} class="btn-action">Rückgängig</button>
						{:else}
							<button onclick={() => advancedOpen = true} class="btn-action">Erweitert</button>
						{/if}
					</div>
				{/each}
			</div>

			{#if activeTimeout}
				<div class="timeout-banner k-mono">
					Auszeit {activeTimeout.teamName}: {activeTimeout.secondsLeft}s
					<button onclick={cancelTimeout} class="btn-timeout-cancel">Abbrechen</button>
				</div>
			{/if}

			{#if match.status === 'finished'}
				<div class="match-finished">
					<p class="finished-title">Match beendet</p>
					<p class="text-mute">
						{match.homeSets > match.guestSets ? match.homeTeamName : match.guestTeamName} gewinnt {match.homeSets}:{match.guestSets}
					</p>
				</div>
			{/if}

			{#if setTimelines.some((t) => t.events.length > 0)}
				<section class="history">
					<p class="k-mono kicker">SPIELVERLAUF</p>
					{#each setTimelines.toReversed() as timeline (timeline.set)}
					{#each timeline.events.toReversed() as evt, i (timeline.events.length - 1 - i)}
						<div class="history-row k-mono">
							<span class="history-set">S{timeline.set}</span>
							<span class="history-score">{evt.type === 'point' ? `${evt.homePoints}:${evt.guestPoints}` : 'TO'}</span>
							<span class="history-team">{evt.type === 'timeout' ? 'TIMEOUT ' : ''}{evt.team === 'home' ? match?.homeTeamName : match?.guestTeamName}</span>
						</div>
					{/each}
					{/each}
				</section>
			{/if}

			<p class="note">
				Du zählst für {match.homeTeamName}. Jeder Tipp geht direkt in den Stream, also entscheide wie ein Linienrichter: genau.
			</p>
		</main>

		<footer class="foot">
			<div class="foot-text">
				<p class="foot-title">Ball is in<span class="foot-dot"></span></p>
				<p class="k-mono foot-url">{shareUrl}</p>
			</div>
			<Pattern name="score" d={8} fg="var(--k-line)" bg="var(--k-surface-alt)" height={168} />
		</footer>

		<dialog bind:this={advancedDialogEl} class="dialog" onclose={() => advancedOpen = false} onclick={(e) => { if (e.target === e.currentTarget) advancedOpen = false; }}>
			<div class="dialog-header">
				<h3>Erweitert</h3>
				<button class="dialog-close" onclick={() => advancedOpen = false} aria-label="Schliessen">&times;</button>
			</div>
			<div class="dialog-body">
				<div class="advanced-grid">
					{#each [{ team: 'home', name: match.homeTeamName }, { team: 'guest', name: match.guestTeamName }] as const as t (t.team)}
						<div class="advanced-team">
							<div class="advanced-team-header">{t.name}</div>
							<button onclick={() => addSet(t.team)} class="btn-action">+ Satz</button>
							<button onclick={() => removeSet(t.team)} class="btn-action">&minus; Satz</button>
						</div>
					{/each}
				</div>
			</div>
			<div class="dialog-footer">
				<button onclick={resetMatch} class="btn-action btn-action-danger">Reset</button>
			</div>
		</dialog>
	{/if}
</div>

<style>
	.control {
		min-height: 100vh;
		background: var(--k-surface);
		color: var(--k-text);
		font-family: var(--font-sans);
		display: flex;
		flex-direction: column;
	}

	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		width: 100%;
		max-width: 720px;
		margin: 0 auto;
		padding: 16px 20px;
	}

	.bar-id { display: flex; align-items: center; gap: 12px; min-width: 0; }
	:global(.bar-mark) { height: 24px; width: auto; flex-shrink: 0; color: var(--k-text); }

	.kicker {
		margin: 0;
		font-size: 11px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--k-text-dim);
	}

	.live-badge {
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

	.start-screen { display: flex; justify-content: center; align-items: center; min-height: 60vh; }

	.tool {
		width: 100%;
		max-width: 720px;
		margin: 0 auto;
		padding: 8px 20px 32px;
		display: flex;
		flex-direction: column;
		gap: 20px;
		flex: 1;
	}

	.teams { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
	.team { display: flex; flex-direction: column; gap: 8px; min-width: 0; }

	.team-name {
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: var(--type-wght-display);
		font-size: 13px;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

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
		margin-bottom: 4px;
		font-size: 10px;
		letter-spacing: 0.08em;
		color: var(--k-text-dim);
	}

	.to { display: inline-flex; align-items: center; gap: 4px; }

	.to-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--k-text);
		border: 1px solid var(--k-text);
	}

	.to-dot.used { background: transparent; border-color: var(--k-text-dim); }

	.btn-point,
	.btn-action {
		border-radius: 0;
		cursor: pointer;
		font-family: var(--font-sans);
		transition: transform var(--dur-mid) var(--ease-glide);
	}

	.btn-point:active,
	.btn-action:active {
		transform: scale(0.94);
		transition-duration: var(--dur-fast);
		transition-timing-function: var(--ease-snap);
	}

	.btn-point {
		width: 100%;
		height: 72px;
		border: 1px solid var(--k-text);
		background: var(--k-text);
		color: var(--k-surface);
		font-size: 16px;
		font-weight: var(--type-wght-bold);
	}

	.btn-point:disabled { opacity: 0.4; cursor: not-allowed; }

	.btn-action {
		width: 100%;
		min-height: 40px;
		padding: 8px 12px;
		border: 1px solid var(--k-line);
		background: transparent;
		color: var(--k-text);
		font-size: 13px;
		font-weight: var(--type-wght-medium);
		text-align: center;
	}

	.btn-action:hover:not(:disabled) { border-color: var(--k-text); }
	.btn-action:disabled { opacity: 0.4; cursor: not-allowed; }

	.btn-action-danger { color: var(--color-error); border-color: var(--color-error); width: auto; }

	.timeout-banner {
		border: 1px solid var(--k-text);
		color: var(--k-text);
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
		border: 1px solid var(--color-error);
		color: var(--color-error);
		border-radius: 0;
		font-size: 12px;
		font-weight: var(--type-wght-medium);
		cursor: pointer;
	}

	.match-finished { border: 1px solid var(--k-line); padding: 20px; text-align: center; }
	.finished-title { margin: 0 0 4px; font-size: 20px; font-weight: var(--type-wght-display); }

	.history { border-top: 1px solid var(--k-line); padding-top: 16px; display: flex; flex-direction: column; gap: 12px; }

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

	.note {
		margin: 0;
		padding-top: 16px;
		border-top: 1px solid var(--k-line);
		font-size: 13px;
		line-height: 1.5;
		color: var(--k-text-mute);
	}

	.foot { background: var(--k-surface-alt); }
	.foot-text { max-width: 720px; margin: 0 auto; padding: 32px 20px 24px; }
	.foot-title { margin: 0; font-size: 25px; font-weight: var(--type-wght-display); letter-spacing: -0.02em; }

	.foot-dot {
		display: inline-block;
		width: 0.24em;
		height: 0.24em;
		margin-left: 0.06em;
		border-radius: 50%;
		background: var(--pulse);
	}

	.foot-url { margin: 8px 0 0; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--k-text-dim); word-break: break-all; }

	.dialog {
		background: var(--k-surface);
		color: var(--k-text);
		border: 1px solid var(--k-line);
		border-radius: 0;
		padding: 0;
		max-width: 480px;
		width: 90vw;
		margin: auto;
	}

	.dialog::backdrop { background: color-mix(in srgb, var(--ink) 60%, transparent); }

	.dialog-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid var(--k-line);
	}

	.dialog-header h3 { margin: 0; font-size: 16px; font-weight: var(--type-wght-bold); }

	.dialog-close {
		background: none;
		border: none;
		color: var(--k-text-mute);
		font-size: 24px;
		cursor: pointer;
		padding: 0;
		line-height: 1;
	}

	.dialog-close:hover { color: var(--k-text); }

	.dialog-body { padding: 16px 20px; }

	.advanced-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
	.advanced-team { display: flex; flex-direction: column; gap: 8px; padding: 0 12px; }
	.advanced-team:first-child { border-right: 1px solid var(--k-line); }
	.advanced-team-header { font-size: 13px; font-weight: var(--type-wght-display); text-transform: uppercase; margin-bottom: 4px; }

	.dialog-footer {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		padding: 16px 20px;
		border-top: 1px solid var(--k-line);
	}

	.text-mute { color: var(--k-text-mute); margin: 0; }

	@media (max-width: 480px) {
		.bar { padding: 14px 16px; }
		.tool { padding: 4px 16px 24px; }
		.team-name { font-size: 12px; }
	}
</style>
