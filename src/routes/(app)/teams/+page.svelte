<script lang="ts">
	import { page } from '$app/state';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	let showCreate = $state(false);
	let newTeamName = $state('');
	let creating = $state(false);

	let favoriteIds = $state<number[]>([]);
	let pinnedIds = $state<number[]>([]);

	$effect(() => {
		pinnedIds = data.pinnedTeamIds;
	});

	$effect(() => {
		const raw = localStorage.getItem('favoriteTeams');
		favoriteIds = raw ? JSON.parse(raw) : [];
	});

	function isFav(id: number): boolean {
		return favoriteIds.includes(id);
	}

	function isPinned(id: number): boolean {
		return pinnedIds.includes(id);
	}

	function toggleFav(id: number) {
		const next = isFav(id) ? favoriteIds.filter((x) => x !== id) : [...favoriteIds, id];
		favoriteIds = next;
		localStorage.setItem('favoriteTeams', JSON.stringify(next));
	}

	async function togglePin(id: number) {
		const next = isPinned(id) ? pinnedIds.filter((x) => x !== id) : [...pinnedIds, id];
		pinnedIds = next;
		await fetch('/api/settings', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ pinnedTeams: JSON.stringify(next) })
		});
	}

	async function createTeam() {
		if (!newTeamName.trim()) return;
		creating = true;
		try {
			const res = await fetch('/api/teams', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newTeamName.trim() })
			});
			if (res.ok) {
				window.location.reload();
			}
		} finally {
			creating = false;
		}
	}
</script>

<div class="min-h-screen bg-bg-base p-4">
	<div class="max-w-2xl mx-auto">
		<div class="flex items-center justify-between mb-6">
			<div>
				<h1 class="text-2xl font-bold text-text-primary">{data.clubName ?? 'Teams'}</h1>
				<p class="text-text-secondary text-sm">Teams verwalten</p>
			</div>
			<button
				onclick={() => { showCreate = !showCreate; }}
				class="bg-accent-mid hover:bg-accent-dark text-white font-semibold rounded-lg px-4 py-2 text-sm"
			>
				+ Team erstellen
			</button>
		</div>

		{#if data.teams.length === 0}
			<div class="bg-bg-panel-alt rounded-xl p-8 text-center">
				<p class="text-text-secondary mb-4">Noch keine Teams vorhanden</p>
				<p class="text-text-tertiary text-sm mb-4">Teams werden automatisch von Swiss Volley synchronisiert.</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each data.teams as team}
					<div class="flex items-center gap-2">
						<a
							href="/teams/{team.id}"
							class="flex-1 flex items-center justify-between bg-bg-panel-alt hover:bg-bg-panel-hover rounded-xl p-4 transition-colors"
						>
							<div>
								<span class="text-text-primary font-medium">{team.name}</span>
								{#if team.swissVolleyTeamId}
									<span class="ml-2 text-xs bg-accent-deepest/30 text-accent px-2 py-0.5 rounded">SV</span>
								{/if}
								{#if isPinned(team.id)}
									<span class="ml-2 text-xs bg-accent-deepest/30 text-accent px-2 py-0.5 rounded">📌 Gepinnt</span>
								{/if}
							</div>
							<span class="text-text-tertiary">&rarr;</span>
						</a>
						<button
							onclick={() => toggleFav(team.id)}
							class="p-2 rounded-lg text-lg {isFav(team.id) ? 'text-yellow-400' : 'text-text-tertiary hover:text-text-secondary'}"
							title={isFav(team.id) ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
						>
							{isFav(team.id) ? '★' : '☆'}
						</button>
						{#if page.data.isAdmin}
							<button
								onclick={() => togglePin(team.id)}
								class="p-2 rounded-lg text-lg {isPinned(team.id) ? 'text-accent' : 'text-text-tertiary hover:text-text-secondary'}"
								title={isPinned(team.id) ? 'Pinning entfernen' : 'Für alle pinnen'}
							>
								📌
							</button>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		{#if showCreate}
			<div class="mt-4">
				<form onsubmit={(e) => { e.preventDefault(); createTeam(); }} class="bg-bg-panel-alt rounded-xl p-4 flex gap-2">
					<input
						type="text"
						bind:value={newTeamName}
						placeholder="Teamname"
						class="flex-1 bg-bg-base border border-border-subtle rounded-lg px-4 py-2 text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent"
					/>
					<button type="submit" disabled={creating} class="bg-accent-mid hover:bg-accent-dark disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-2">
						{creating ? '...' : 'Erstellen'}
					</button>
					<button type="button" onclick={() => { showCreate = false; }} class="text-text-secondary hover:text-text-primary px-2">
						&times;
					</button>
				</form>
			</div>
		{/if}

		<div class="mt-6 pt-4 border-t border-border-default">
			<a href="/control" class="text-sm text-text-tertiary hover:text-text-primary">Legacy Control Panel &rarr;</a>
		</div>
	</div>
</div>
