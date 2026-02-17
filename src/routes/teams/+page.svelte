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

<div class="min-h-screen bg-[#0b0e1a] p-4">
	<div class="max-w-2xl mx-auto">
		<div class="flex items-center justify-between mb-6">
			<div>
				<h1 class="text-2xl font-bold text-white">{data.clubName ?? 'Teams'}</h1>
				<p class="text-gray-400 text-sm">Teams verwalten</p>
			</div>
			<a href="/?edit=true" class="text-sm text-gray-500 hover:text-gray-300">Einstellungen</a>
		</div>

		{#if data.teams.length === 0}
			<div class="bg-[#151929] rounded-xl p-8 text-center">
				<p class="text-gray-400 mb-4">Noch keine Teams vorhanden</p>
				<p class="text-gray-500 text-sm mb-4">Teams werden automatisch von Swiss Volley synchronisiert.</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each data.teams as team}
					<a
						href="/teams/{team.id}"
						class="flex items-center justify-between bg-[#151929] hover:bg-[#1a2035] rounded-xl p-4 transition-colors"
					>
						<div>
							<span class="text-white font-medium">{team.name}</span>
							{#if team.swissVolleyTeamId}
								<span class="ml-2 text-xs bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded">SV</span>
							{/if}
						</div>
						<span class="text-gray-500">&rarr;</span>
					</a>
				{/each}
			</div>
		{/if}

		<div class="mt-4">
			{#if showCreate}
				<form onsubmit={(e) => { e.preventDefault(); createTeam(); }} class="bg-[#151929] rounded-xl p-4 flex gap-2">
					<input
						type="text"
						bind:value={newTeamName}
						placeholder="Teamname"
						class="flex-1 bg-[#0b0e1a] border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
					/>
					<button type="submit" disabled={creating} class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-2">
						{creating ? '...' : 'Erstellen'}
					</button>
					<button type="button" onclick={() => { showCreate = false; }} class="text-gray-400 hover:text-white px-2">
						&times;
					</button>
				</form>
			{:else}
				<button onclick={() => { showCreate = true; }} class="w-full bg-[#151929] hover:bg-[#1a2035] text-gray-400 rounded-xl p-4 transition-colors">
					+ Team manuell erstellen
				</button>
			{/if}
		</div>

		<div class="mt-6 pt-4 border-t border-gray-800">
			<a href="/control" class="text-sm text-gray-500 hover:text-gray-300">Legacy Control Panel &rarr;</a>
		</div>
	</div>
</div>
