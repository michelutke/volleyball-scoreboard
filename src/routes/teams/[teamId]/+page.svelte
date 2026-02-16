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
	let aborting = $state<number | null>(null);

	const defaultLeague = $derived(data.matches.find((m) => m.league)?.league ?? '');
	const defaultVenue = $derived(data.matches.find((m) => m.venue)?.venue ?? '');

	$effect(() => {
		if (showCreate) {
			homeTeamName = data.team.name;
			guestTeamName = '';
			league = defaultLeague;
			venue = defaultVenue;
			scheduledAt = '';
		}
	});

	function swapTeams() {
		const tmp = homeTeamName;
		homeTeamName = guestTeamName;
		guestTeamName = tmp;
	}

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
			case 'finished': return { text: 'Beendet', class: 'bg-gray-700 text-gray-300' };
			default: return { text: 'Geplant', class: 'bg-blue-900/40 text-blue-400' };
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

	async function abortMatch(matchId: number) {
		if (!confirm('Spiel wirklich abbrechen?')) return;
		aborting = matchId;
		try {
			const res = await fetch(`/api/matches/${matchId}/abort`, { method: 'POST' });
			if (res.ok) {
				window.location.reload();
			}
		} finally {
			aborting = null;
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

	function copyOverlayLink(matchId: number) {
		navigator.clipboard.writeText(`${window.location.origin}/matches/${matchId}/overlay`);
	}
</script>

<div class="min-h-screen bg-[#0b0e1a] p-4">
	<div class="max-w-2xl mx-auto">
		<div class="mb-6">
			<a href="/teams" class="text-sm text-gray-500 hover:text-gray-300 mb-2 inline-block">&larr; Teams</a>
			<h1 class="text-2xl font-bold text-white">{data.team.name}</h1>
			<p class="text-gray-400 text-sm">Spielplan</p>
		</div>

		<!-- Tabs -->
		<div class="flex gap-1 bg-[#151929] rounded-xl p-1 mb-4">
			<button
				onclick={() => { tab = 'upcoming'; }}
				class="flex-1 py-2 rounded-lg text-sm font-medium transition-colors {tab === 'upcoming' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}"
			>
				Kommende ({upcomingMatches.length})
			</button>
			<button
				onclick={() => { tab = 'past'; }}
				class="flex-1 py-2 rounded-lg text-sm font-medium transition-colors {tab === 'past' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}"
			>
				Vergangene ({pastMatches.length})
			</button>
		</div>

		<!-- Match list -->
		<div class="space-y-2">
			{#each tab === 'upcoming' ? upcomingMatches : pastMatches as match}
				<div class="bg-[#151929] rounded-xl p-4">
					<div class="flex items-start justify-between mb-2">
						<div class="flex-1">
							<div class="text-white font-medium">
								{match.homeTeamName} <span class="text-gray-500">vs</span> {match.guestTeamName}
							</div>
							<div class="text-xs text-gray-500 mt-1 space-x-3">
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
						<div class="text-sm text-gray-300 mb-2">{match.homeSets} : {match.guestSets}</div>
					{/if}

					<div class="flex gap-2 mt-2">
						{#if match.status === 'upcoming'}
							<button
								onclick={() => activateMatch(match.id)}
								disabled={activating === match.id}
								class="text-xs bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg"
							>
								{activating === match.id ? '...' : 'Scoring starten'}
							</button>
						{:else if match.status === 'live'}
							<a href="/matches/{match.id}/control" class="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg">
								Control
							</a>
							<button
								onclick={() => abortMatch(match.id)}
								disabled={aborting === match.id}
								class="text-xs bg-red-900/50 hover:bg-red-800/50 disabled:opacity-50 text-red-300 px-3 py-1.5 rounded-lg"
							>
								{aborting === match.id ? '...' : 'Abbrechen'}
							</button>
						{/if}
						<button
							onclick={() => copyOverlayLink(match.id)}
							class="text-xs bg-[#0b0e1a] hover:bg-gray-800 text-gray-400 px-3 py-1.5 rounded-lg"
							title="Overlay-Link kopieren"
						>
							Overlay-Link
						</button>
					</div>
				</div>
			{:else}
				<div class="bg-[#151929] rounded-xl p-8 text-center text-gray-500">
					{tab === 'upcoming' ? 'Keine kommenden Spiele' : 'Keine vergangenen Spiele'}
				</div>
			{/each}
		</div>

		<!-- Create match -->
		<div class="mt-4">
			{#if showCreate}
				<form onsubmit={(e) => { e.preventDefault(); createMatch(); }} class="bg-[#151929] rounded-xl p-4 space-y-3">
					<div class="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
						<input type="text" bind:value={homeTeamName} placeholder="Heim" class="bg-[#0b0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500" />
						<button type="button" onclick={swapTeams} class="text-gray-400 hover:text-white text-lg px-1" title="Teams tauschen">&hArr;</button>
						<input type="text" bind:value={guestTeamName} placeholder="Gast" class="bg-[#0b0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500" />
					</div>
					<input type="datetime-local" bind:value={scheduledAt} class="w-full bg-[#0b0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
					<div class="grid grid-cols-2 gap-2">
						<input type="text" bind:value={venue} placeholder="Spielort" class="bg-[#0b0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500" />
						<input type="text" bind:value={league} placeholder="Liga" class="bg-[#0b0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500" />
					</div>
					<div class="flex gap-2">
						<button type="submit" disabled={creating} class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-2 text-sm">
							{creating ? '...' : 'Erstellen'}
						</button>
						<button type="button" onclick={() => { showCreate = false; }} class="text-gray-400 hover:text-white px-2">Abbrechen</button>
					</div>
				</form>
			{:else}
				<button onclick={() => { showCreate = true; }} class="w-full bg-[#151929] hover:bg-[#1a2035] text-gray-400 rounded-xl p-4 transition-colors">
					+ Match manuell erstellen
				</button>
			{/if}
		</div>
	</div>
</div>
