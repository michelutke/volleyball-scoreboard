<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types.js';
	import type { MatchListItem } from '$lib/types.js';

	let { data }: { data: PageData } = $props();

	type TeamEntry = {
		teamId: number;
		teamName: string;
		isPinned: boolean;
		matches: MatchListItem[];
		loading: boolean;
	};

	let entries = $state<TeamEntry[]>([]);
	let loaded = $state(false);

	function formatDate(iso: string | null): string {
		if (!iso) return '–';
		const d = new Date(iso);
		return d.toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	function statusBadge(status: string): { text: string; cls: string } {
		switch (status) {
			case 'live': return { text: 'Live', cls: 'bg-red-600 text-white' };
			case 'finished': return { text: 'Beendet', cls: 'bg-bg-panel-hover text-text-primary' };
			default: return { text: 'Geplant', cls: 'bg-accent-deepest/40 text-accent' };
		}
	}

	onMount(async () => {
		const favJson = localStorage.getItem('favoriteTeams');
		const favIds: number[] = favJson ? JSON.parse(favJson) : [];
		const pinnedIds = data.pinnedTeamIds;
		const allIds = [...new Set([...pinnedIds, ...favIds])];

		if (allIds.length === 0) {
			loaded = true;
			return;
		}

		// Fetch team names
		const teamsRes = await fetch('/api/teams');
		const allTeams: { id: number; name: string }[] = teamsRes.ok ? await teamsRes.json() : [];
		const teamMap = new Map(allTeams.map((t) => [t.id, t.name]));

		entries = allIds.map((id) => ({
			teamId: id,
			teamName: teamMap.get(id) ?? `Team #${id}`,
			isPinned: pinnedIds.includes(id),
			matches: [],
			loading: true
		}));

		await Promise.all(
			allIds.map(async (id, i) => {
				try {
					const res = await fetch(`/api/teams/${id}/matches`);
					if (res.ok) {
						const all: MatchListItem[] = await res.json();
						const upcoming = all
							.filter((m) => m.status !== 'finished')
							.sort((a, b) => {
								if (!a.scheduledAt) return 1;
								if (!b.scheduledAt) return -1;
								return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
							});
						entries[i] = { ...entries[i], matches: upcoming, loading: false };
					} else {
						entries[i] = { ...entries[i], loading: false };
					}
				} catch {
					entries[i] = { ...entries[i], loading: false };
				}
			})
		);
		loaded = true;
	});
</script>

<div class="min-h-screen bg-bg-base p-4">
	<div class="max-w-2xl mx-auto">
		<div class="mb-6">
			<h1 class="text-2xl font-bold text-text-primary">Dashboard</h1>
			<p class="text-text-secondary text-sm">Kommende Spiele deiner Favoriten</p>
		</div>

		{#if !loaded}
			<div class="bg-bg-panel-alt rounded-xl p-8 text-center text-text-tertiary">Laden...</div>
		{:else if entries.length === 0}
			<div class="bg-bg-panel-alt rounded-xl p-8 text-center">
				<p class="text-text-secondary">Noch keine Favoriten</p>
				<p class="text-text-tertiary text-sm mt-2">Teams unter <a href="/teams" class="text-accent underline">Teams</a> als Favorit markieren.</p>
			</div>
		{:else}
			<div class="space-y-6">
				{#each entries as entry}
					<div>
						<div class="flex items-center gap-2 mb-2">
							<span class="text-sm">{entry.isPinned ? '📌' : '★'}</span>
							<a href="/teams/{entry.teamId}" class="text-text-primary font-semibold hover:underline">{entry.teamName}</a>
						</div>
						{#if entry.loading}
							<div class="text-text-tertiary text-sm">Laden...</div>
						{:else if entry.matches.length === 0}
							<div class="text-text-tertiary text-sm">Keine kommenden Spiele</div>
						{:else}
							<div class="space-y-2">
								{#each entry.matches as match}
									<div class="bg-bg-panel-alt rounded-xl p-4 border-l-2 {entry.isPinned ? 'border-accent' : 'border-border-subtle'}">
										<div class="flex items-start justify-between">
											<div class="flex-1">
												<div class="text-text-primary font-medium">{match.homeTeamName} <span class="text-text-tertiary">vs</span> {match.guestTeamName}</div>
												<div class="text-xs text-text-tertiary mt-1 space-x-3">
													<span>{formatDate(match.scheduledAt)}</span>
													{#if match.venue}<span>{match.venue}</span>{/if}
													{#if match.league}<span>{match.league}</span>{/if}
												</div>
											</div>
											<div class="flex items-center gap-2">
												{#if entry.isPinned}<span class="text-xs text-accent">📌</span>{/if}
												<span class="text-xs px-2 py-0.5 rounded {statusBadge(match.status).cls}">{statusBadge(match.status).text}</span>
											</div>
										</div>
										{#if match.status === 'live'}
											<div class="mt-2">
												<a href="/matches/{match.id}/control" class="text-xs bg-accent-mid hover:bg-accent-dark text-white px-3 py-1.5 rounded-lg">Control</a>
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
