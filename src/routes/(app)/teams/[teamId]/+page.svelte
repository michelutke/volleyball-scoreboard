<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { onMount, tick } from 'svelte';
	import { KButton, KEmpty, KField, KInput } from '$lib/components/k';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	let tab = $state<'upcoming' | 'past'>('upcoming');
	let showCreate = $state(false);
	let homeTeamName = $state('');
	let guestTeamName = $state('');
	let scheduledAt = $state('');
	let venue = $state('');
	let league = $state('');
	let creating = $state(false);
	let activating = $state<number | null>(null);
	let cancelling = $state<number | null>(null);

	let tabsWrap = $state<HTMLDivElement | null>(null);
	let indicatorStyle = $state('opacity:0');

	function isDatePast(scheduledAt: string | null): boolean {
		if (!scheduledAt) return false;
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return new Date(scheduledAt) < today;
	}

	const upcomingMatches = $derived(
		data.matches
			.filter((m) => m.status === 'live' || (m.status === 'upcoming' && !isDatePast(m.scheduledAt)))
			.sort((a, b) => {
				if (!a.scheduledAt && !b.scheduledAt) return 0;
				if (!a.scheduledAt) return 1;
				if (!b.scheduledAt) return -1;
				return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
			})
	);

	const pastMatches = $derived(
		data.matches
			.filter((m) => m.status === 'finished' || (m.status === 'upcoming' && isDatePast(m.scheduledAt)))
			.sort((a, b) => {
				if (!a.scheduledAt && !b.scheduledAt) return 0;
				if (!a.scheduledAt) return 1;
				if (!b.scheduledAt) return -1;
				return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime();
			})
	);

	function formatDate(iso: string | null): string {
		if (!iso) return '...';
		const d = new Date(iso);
		return d.toLocaleDateString('de-CH', {
			weekday: 'short',
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	async function activateMatch(matchId: number) {
		activating = matchId;
		try {
			const res = await fetch(`/api/matches/${matchId}/activate`, { method: 'POST' });
			if (res.ok) {
				await goto(`/matches/${matchId}/control`);
			}
		} finally {
			activating = null;
		}
	}

	async function createMatch() {
		if (!homeTeamName.trim() || !guestTeamName.trim()) return;
		creating = true;
		try {
			const res = await fetch(`/api/teams/${data.team.id}/matches`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					homeTeamName: homeTeamName.trim(),
					guestTeamName: guestTeamName.trim(),
					scheduledAt: scheduledAt || null,
					venue: venue.trim() || null,
					league: league.trim() || null
				})
			});
			if (res.ok) {
				await invalidateAll();
				showCreate = false;
				homeTeamName = '';
				guestTeamName = '';
				scheduledAt = '';
				venue = '';
				league = '';
			}
		} finally {
			creating = false;
		}
	}

	async function cancelMatch(matchId: number) {
		if (!confirm('Scoring wirklich abbrechen?')) return;
		cancelling = matchId;
		try {
			const res = await fetch(`/api/matches/${matchId}/cancel`, { method: 'POST' });
			if (res.ok) await invalidateAll();
		} finally {
			cancelling = null;
		}
	}

	function copyOverlayLink(matchId: number) {
		navigator.clipboard.writeText(`${window.location.origin}/matches/${matchId}/overlay`);
	}

	async function positionIndicator() {
		if (!tabsWrap) return;
		await tick();
		const active = tabsWrap.querySelector<HTMLButtonElement>('button.active');
		if (!active) {
			indicatorStyle = 'opacity:0';
			return;
		}
		const wrapRect = tabsWrap.getBoundingClientRect();
		const r = active.getBoundingClientRect();
		const left = r.left - wrapRect.left;
		const width = r.width;
		indicatorStyle = `transform:translateX(${left}px);width:${width}px;opacity:1`;
	}

	$effect(() => {
		void tab;
		positionIndicator();
	});

	onMount(() => {
		positionIndicator();
		const onResize = () => positionIndicator();
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	});

	const visibleMatches = $derived(tab === 'upcoming' ? upcomingMatches : pastMatches);
</script>

<div class="page">
	<div class="wrap">
		<a href="/teams" class="back k-mono">← Teams</a>
		<p class="kicker k-mono">Team · Spielplan</p>
		<h1 class="title k-display">{data.team.name}</h1>

		<div class="tabs" bind:this={tabsWrap}>
			<span class="tab-indicator" style={indicatorStyle} aria-hidden="true"></span>
			<button class:active={tab === 'upcoming'} onclick={() => (tab = 'upcoming')}>
				<span>Kommende</span>
				<span class="count k-mono">{upcomingMatches.length}</span>
			</button>
			<button class:active={tab === 'past'} onclick={() => (tab = 'past')}>
				<span>Vergangene</span>
				<span class="count k-mono">{pastMatches.length}</span>
			</button>
		</div>

		{#if visibleMatches.length === 0}
			<KEmpty
				numeral="00"
				title={tab === 'upcoming' ? 'Keine kommenden Spiele' : 'Keine vergangenen Spiele'}
				body=""
			/>
		{:else}
			<ul class="match-list">
				{#each visibleMatches as match, i}
					<li class="match-row">
						<span class="row-num k-mono">{String(i + 1).padStart(2, '0')}</span>
						<div class="row-body">
							<div class="row-head">
								<span class="row-name">{match.homeTeamName} <span class="vs">vs</span> {match.guestTeamName}</span>
								{#if match.status === 'live'}
									<span class="badge badge-live">Live</span>
								{:else if match.status === 'finished'}
									<span class="badge">Beendet</span>
								{:else}
									<span class="badge badge-cool">Geplant</span>
								{/if}
							</div>
							<div class="row-meta k-mono">
								<span>{formatDate(match.scheduledAt)}</span>
								{#if match.venue}<span>· {match.venue}</span>{/if}
								{#if match.league}<span>· {match.league}</span>{/if}
							</div>
							{#if match.status === 'finished' && match.homeSets != null && match.guestSets != null}
								<div class="row-score k-mono">{match.homeSets} : {match.guestSets}</div>
							{/if}
							<div class="row-actions">
								{#if match.status === 'upcoming'}
									<KButton
										variant="primary"
										size="sm"
										onclick={() => activateMatch(match.id)}
										disabled={activating === match.id}
									>
										{activating === match.id ? '...' : 'Scoring starten'}
									</KButton>
								{:else if match.status === 'live'}
									<KButton variant="primary" size="sm" href="/matches/{match.id}/control">
										Control
									</KButton>
								{/if}
								<KButton variant="secondary" size="sm" onclick={() => copyOverlayLink(match.id)}>
									Overlay-Link
								</KButton>
								{#if match.status === 'live'}
									<KButton variant="danger" size="sm" onclick={() => cancelMatch(match.id)} disabled={cancelling === match.id}>
										{cancelling === match.id ? '...' : 'Abbrechen'}
									</KButton>
								{/if}
							</div>
						</div>
					</li>
				{/each}
			</ul>
		{/if}

		<div class="create-block">
			{#if showCreate}
				<form
					class="create-form"
					onsubmit={(e) => {
						e.preventDefault();
						createMatch();
					}}
				>
					<div class="form-row">
						<KField label="Heim" for="homeName">
							<KInput id="homeName" type="text" bind:value={homeTeamName} placeholder="Heimteam" />
						</KField>
						<KField label="Gast" for="guestName">
							<KInput id="guestName" type="text" bind:value={guestTeamName} placeholder="Gastteam" />
						</KField>
					</div>
					<KField label="Termin" for="schedAt">
						<KInput id="schedAt" type="datetime-local" bind:value={scheduledAt} />
					</KField>
					<div class="form-row">
						<KField label="Spielort" for="venue">
							<KInput id="venue" type="text" bind:value={venue} placeholder="Halle / Ort" />
						</KField>
						<KField label="Liga" for="league">
							<KInput id="league" type="text" bind:value={league} placeholder="Liga" />
						</KField>
					</div>
					<div class="form-actions">
						<KButton variant="primary" disabled={creating}>
							{creating ? '...' : 'Erstellen'}
						</KButton>
						<KButton variant="ghost" onclick={() => (showCreate = false)}>Abbrechen</KButton>
					</div>
				</form>
			{:else}
				<KButton variant="secondary" full onclick={() => (showCreate = true)}>
					+ Match manuell erstellen
				</KButton>
			{/if}
		</div>
	</div>
</div>

<style>
	.page {
		min-height: 100vh;
		background: var(--k-surface);
		color: var(--k-text);
		padding: 32px var(--grid-margin) 80px;
	}

	.wrap {
		max-width: 720px;
		margin: 0 auto;
	}

	.back {
		display: inline-block;
		font-size: 11px;
		letter-spacing: 0.1em;
		color: var(--k-text-dim);
		text-decoration: none;
		margin-bottom: 16px;
	}
	.back:hover {
		color: var(--k-text);
	}

	.kicker {
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--k-text-dim);
		margin: 0 0 12px;
	}

	.title {
		font-size: clamp(32px, 5vw, 56px);
		line-height: 1;
		letter-spacing: -0.025em;
		margin: 0 0 32px;
	}

	.tabs {
		position: relative;
		display: flex;
		gap: 8px;
		border-bottom: 1px solid var(--k-line);
		margin-bottom: 24px;
	}

	.tabs button {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		background: transparent;
		border: none;
		padding: 12px 16px;
		font-family: var(--font-display);
		font-weight: var(--type-wght-medium);
		font-size: 14px;
		color: var(--k-text-mute);
		cursor: pointer;
		transition: color var(--dur-fast) var(--ease-snap);
		z-index: 1;
	}
	.tabs button:hover {
		color: var(--k-text);
	}
	.tabs button.active {
		color: var(--k-text);
	}

	.count {
		font-size: 10px;
		letter-spacing: 0.1em;
		color: var(--k-text-dim);
		padding: 2px 6px;
		border: 1px solid var(--k-line);
	}
	.tabs button.active .count {
		border-color: var(--pulse);
		color: var(--pulse);
	}

	.tab-indicator {
		position: absolute;
		left: 0;
		bottom: -1px;
		height: 2px;
		background: var(--pulse);
		transition:
			transform var(--dur-mid) var(--ease-snap),
			width var(--dur-mid) var(--ease-snap),
			opacity var(--dur-fast) var(--ease-snap);
		pointer-events: none;
	}

	.match-list {
		list-style: none;
		margin: 0 0 24px;
		padding: 0;
		border-top: 1px solid var(--k-line);
	}

	.match-row {
		display: flex;
		gap: 16px;
		padding: 18px 4px;
		border-bottom: 1px solid var(--k-line);
	}

	.row-num {
		font-size: 11px;
		letter-spacing: 0.1em;
		color: var(--k-text-dim);
		min-width: 24px;
		padding-top: 3px;
	}

	.row-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.row-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	.row-name {
		font-family: var(--font-display);
		font-weight: var(--type-wght-medium);
		font-size: 16px;
		letter-spacing: -0.01em;
		color: var(--k-text);
	}

	.vs {
		color: var(--k-text-dim);
		font-weight: 400;
	}

	.badge {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		padding: 3px 8px;
		border: 1px solid var(--k-line);
		color: var(--k-text-dim);
	}
	.badge-live {
		color: var(--paper);
		background: var(--pulse);
		border-color: var(--pulse);
	}
	.badge-cool {
		color: var(--cool);
		border-color: var(--cool);
	}

	.row-meta {
		font-size: 11px;
		letter-spacing: 0.06em;
		color: var(--k-text-dim);
		display: flex;
		gap: 4px;
		flex-wrap: wrap;
	}

	.row-score {
		font-size: 18px;
		color: var(--k-text);
		font-variant-numeric: tabular-nums;
	}

	.row-actions {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		margin-top: 4px;
	}

	.create-block {
		margin-top: 16px;
	}

	.create-form {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 20px 24px;
		background: var(--k-surface-alt);
		border: 1px solid var(--k-line);
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}

	.form-actions {
		display: flex;
		gap: 8px;
	}

	@media (max-width: 480px) {
		.form-row {
			grid-template-columns: 1fr;
		}
	}
</style>
