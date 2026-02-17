<script lang="ts">
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	let showCreate = $state(false);
	let newTeamName = $state('');
	let creating = $state(false);

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
				<h1 class="text-2xl font-bold text-white">{data.clubName ?? 'Teams'}</h1>
				<p class="text-text-secondary text-sm">Teams verwalten</p>
			</div>
			<a href="/?edit=true" class="text-sm text-text-tertiary hover:text-text-primary">Einstellungen</a>
		</div>

		{#if data.teams.length === 0}
			<div class="bg-bg-panel-alt rounded-xl p-8 text-center">
				<p class="text-text-secondary mb-4">Noch keine Teams vorhanden</p>
				<p class="text-text-tertiary text-sm mb-4">Teams werden automatisch von Swiss Volley synchronisiert.</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each data.teams as team}
					<a
						href="/teams/{team.id}"
						class="flex items-center justify-between bg-bg-panel-alt hover:bg-bg-panel-hover rounded-xl p-4 transition-colors"
					>
						<div>
							<span class="text-white font-medium">{team.name}</span>
							{#if team.swissVolleyTeamId}
								<span class="ml-2 text-xs bg-accent-deepest/30 text-accent px-2 py-0.5 rounded">SV</span>
							{/if}
						</div>
						<span class="text-text-tertiary">&rarr;</span>
					</a>
				{/each}
			</div>
		{/if}

		<div class="mt-4">
			{#if showCreate}
				<form onsubmit={(e) => { e.preventDefault(); createTeam(); }} class="bg-bg-panel-alt rounded-xl p-4 flex gap-2">
					<input
						type="text"
						bind:value={newTeamName}
						placeholder="Teamname"
						class="flex-1 bg-bg-base border border-border-subtle rounded-lg px-4 py-2 text-white placeholder-text-tertiary focus:outline-none focus:border-accent"
					/>
					<button type="submit" disabled={creating} class="bg-accent-mid hover:bg-accent-dark disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-2">
						{creating ? '...' : 'Erstellen'}
					</button>
					<button type="button" onclick={() => { showCreate = false; }} class="text-text-secondary hover:text-white px-2">
						&times;
					</button>
				</form>
			{:else}
				<button onclick={() => { showCreate = true; }} class="w-full bg-bg-panel-alt hover:bg-bg-panel-hover text-text-secondary rounded-xl p-4 transition-colors">
					+ Team manuell erstellen
				</button>
			{/if}
		</div>

		<div class="mt-6 pt-4 border-t border-border-default">
			<a href="/control" class="text-sm text-text-tertiary hover:text-text-primary">Legacy Control Panel &rarr;</a>
		</div>
	</div>
</div>
