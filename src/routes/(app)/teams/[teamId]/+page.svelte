<script lang="ts">
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	let tab: 'upcoming' | 'past' = $state('upcoming');
	let showCreate = $state(false);
	let homeTeamName = $state('');
	let guestTeamName = $state('');
	let scheduledAt = $state('');
	let venue = $state('');
	let league = $state('');
	let creating = $state(false);
	let activating = $state<number | null>(null);
	let cancelling = $state<number | null>(null);

	const upcomingMatches = $derived(
		data.matches
			.filter((m) => m.status !== 'finished')
			.sort((a, b) => {
				if (!a.scheduledAt && !b.scheduledAt) return 0;
				if (!a.scheduledAt) return 1;
				if (!b.scheduledAt) return -1;
				return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
			})
	);

	const pastMatches = $derived(
		data.matches
			.filter((m) => m.status === 'finished')
			.sort((a, b) => {
				if (!a.scheduledAt && !b.scheduledAt) return 0;
				if (!a.scheduledAt) return 1;
				if (!b.scheduledAt) return -1;
				return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime();
			})
	);

	function formatDate(iso: string | null): string {
		if (!iso) return '–';
		const d = new Date(iso);
		return d.toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	function statusBadge(status: string): { text: string; class: string } {
		switch (status) {
			case 'live': return { text: 'Live', class: 'bg-red-600 text-white' };
			case 'finished': return { text: 'Beendet', class: 'bg-bg-panel-hover text-text-primary' };
			default: return { text: 'Geplant', class: 'bg-accent-deepest/40 text-accent' };
		}
	}

	async function activateMatch(matchId: number) {
		activating = matchId;
		try {
			const res = await fetch(`/api/matches/${matchId}/activate`, { method: 'POST' });
			if (res.ok) {
				window.location.href = `/matches/${matchId}/control`;
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
			if (res.ok) window.location.reload();
		} finally {
			creating = false;
		}
	}

	async function cancelMatch(matchId: number) {
		if (!confirm('Scoring wirklich abbrechen?')) return;
		cancelling = matchId;
		try {
			const res = await fetch(`/api/matches/${matchId}/cancel`, { method: 'POST' });
			if (res.ok) window.location.reload();
		} finally {
			cancelling = null;
		}
	}

	function copyOverlayLink(matchId: number) {
		navigator.clipboard.writeText(`${window.location.origin}/matches/${matchId}/overlay`);
	}
</script>

<div class="min-h-screen bg-bg-base p-4">
	<div class="max-w-2xl mx-auto">
		<div class="mb-6">
			<a href="/teams" class="text-sm text-text-tertiary hover:text-text-primary mb-2 inline-block">&larr; Teams</a>
			<h1 class="text-2xl font-bold text-text-primary">{data.team.name}</h1>
			<p class="text-text-secondary text-sm">Spielplan</p>
		</div>

		<!-- Tabs -->
		<div class="flex gap-1 bg-bg-panel-alt rounded-xl p-1 mb-4">
			<button
				onclick={() => { tab = 'upcoming'; }}
				class="flex-1 py-2 rounded-lg text-sm font-medium transition-colors {tab === 'upcoming' ? 'bg-accent-mid text-white' : 'text-text-secondary hover:text-text-primary'}"
			>
				Kommende ({upcomingMatches.length})
			</button>
			<button
				onclick={() => { tab = 'past'; }}
				class="flex-1 py-2 rounded-lg text-sm font-medium transition-colors {tab === 'past' ? 'bg-accent-mid text-white' : 'text-text-secondary hover:text-text-primary'}"
			>
				Vergangene ({pastMatches.length})
			</button>
		</div>

		<!-- Match list -->
		<div class="space-y-2">
			{#each tab === 'upcoming' ? upcomingMatches : pastMatches as match}
				<div class="bg-bg-panel-alt rounded-xl p-4">
					<div class="flex items-start justify-between mb-2">
						<div class="flex-1">
							<div class="text-text-primary font-medium">
								{match.homeTeamName} <span class="text-text-tertiary">vs</span> {match.guestTeamName}
							</div>
							<div class="text-xs text-text-tertiary mt-1 space-x-3">
								<span>{formatDate(match.scheduledAt)}</span>
								{#if match.venue}<span>{match.venue}</span>{/if}
								{#if match.league}<span>{match.league}</span>{/if}
							</div>
						</div>
						<span class="text-xs px-2 py-0.5 rounded {statusBadge(match.status).class}">
							{statusBadge(match.status).text}
						</span>
					</div>

					{#if match.status === 'finished' && match.homeSets != null && match.guestSets != null}
						<div class="text-sm text-text-primary mb-2">{match.homeSets} : {match.guestSets}</div>
					{/if}

					<div class="flex justify-between items-center mt-2">
						<div class="flex gap-2">
							{#if match.status === 'upcoming'}
								<button
									onclick={() => activateMatch(match.id)}
									disabled={activating === match.id}
									class="text-xs bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg"
								>
									{activating === match.id ? '...' : 'Scoring starten'}
								</button>
							{:else if match.status === 'live'}
								<a href="/matches/{match.id}/control" class="text-xs bg-accent-mid hover:bg-accent-dark text-white px-3 py-1.5 rounded-lg">
									Control
								</a>
							{/if}
							<button
								onclick={() => copyOverlayLink(match.id)}
								class="text-xs bg-bg-base hover:bg-bg-panel-hover text-text-secondary px-3 py-1.5 rounded-lg"
								title="Overlay-Link kopieren"
							>
								Overlay-Link
							</button>
						</div>
						{#if match.status === 'live'}
							<button
								onclick={() => cancelMatch(match.id)}
								disabled={cancelling === match.id}
								class="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 px-2 py-1.5"
							>
								{cancelling === match.id ? '...' : 'Abbrechen'}
							</button>
						{/if}
					</div>
				</div>
			{:else}
				<div class="bg-bg-panel-alt rounded-xl p-8 text-center text-text-tertiary">
					{tab === 'upcoming' ? 'Keine kommenden Spiele' : 'Keine vergangenen Spiele'}
				</div>
			{/each}
		</div>

		<!-- Create match -->
		<div class="mt-4">
			{#if showCreate}
				<form onsubmit={(e) => { e.preventDefault(); createMatch(); }} class="bg-bg-panel-alt rounded-xl p-4 space-y-3">
					<div class="grid grid-cols-2 gap-2">
						<input type="text" bind:value={homeTeamName} placeholder="Heim" class="bg-bg-base border border-border-subtle rounded-lg px-3 py-2 text-text-primary text-sm placeholder-text-tertiary focus:outline-none focus:border-accent" />
						<input type="text" bind:value={guestTeamName} placeholder="Gast" class="bg-bg-base border border-border-subtle rounded-lg px-3 py-2 text-text-primary text-sm placeholder-text-tertiary focus:outline-none focus:border-accent" />
					</div>
					<input type="datetime-local" bind:value={scheduledAt} class="w-full bg-bg-base border border-border-subtle rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent" />
					<div class="grid grid-cols-2 gap-2">
						<input type="text" bind:value={venue} placeholder="Spielort" class="bg-bg-base border border-border-subtle rounded-lg px-3 py-2 text-text-primary text-sm placeholder-text-tertiary focus:outline-none focus:border-accent" />
						<input type="text" bind:value={league} placeholder="Liga" class="bg-bg-base border border-border-subtle rounded-lg px-3 py-2 text-text-primary text-sm placeholder-text-tertiary focus:outline-none focus:border-accent" />
					</div>
					<div class="flex gap-2">
						<button type="submit" disabled={creating} class="bg-accent-mid hover:bg-accent-dark disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-2 text-sm">
							{creating ? '...' : 'Erstellen'}
						</button>
						<button type="button" onclick={() => { showCreate = false; }} class="text-text-secondary hover:text-text-primary px-2">Abbrechen</button>
					</div>
				</form>
			{:else}
				<button onclick={() => { showCreate = true; }} class="w-full bg-bg-panel-alt hover:bg-bg-panel-hover text-text-secondary rounded-xl p-4 transition-colors">
					+ Match manuell erstellen
				</button>
			{/if}
		</div>
	</div>
</div>
