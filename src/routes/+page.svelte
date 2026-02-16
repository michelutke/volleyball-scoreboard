<script lang="ts">
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	const isEditing = $derived(!!(data.clubName || data.swissVolleyClubId));

	const initialClubName = data.clubName ?? '';
	const initialClubId = data.swissVolleyClubId ?? '';
	let clubName = $state(initialClubName);
	let clubId = $state(initialClubId);
	let saving = $state(false);
	let error = $state('');

	let clubSearch = $state('');
	let clubResults = $state<{ id: string; name: string }[]>([]);
	let searching = $state(false);
	let searchTimeout: ReturnType<typeof setTimeout> | undefined;

	async function searchClubs(query: string) {
		if (query.length < 2) {
			clubResults = [];
			return;
		}
		searching = true;
		try {
			const res = await fetch(`/api/swiss-volley?action=searchClubs&query=${encodeURIComponent(query)}`);
			if (res.ok) {
				clubResults = await res.json();
			} else {
				clubResults = [];
			}
		} catch {
			clubResults = [];
		} finally {
			searching = false;
		}
	}

	function onSearchInput() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => searchClubs(clubSearch), 300);
	}

	function selectClub(club: { id: string; name: string }) {
		clubId = club.id;
		if (!clubName.trim()) clubName = club.name;
		clubSearch = club.name;
		clubResults = [];
	}

	async function submit() {
		if (!clubName.trim()) {
			error = 'Vereinsname ist erforderlich';
			return;
		}
		saving = true;
		error = '';
		try {
			const settings: Record<string, string> = { clubName: clubName.trim() };
			if (clubId.trim()) settings.swissVolleyClubId = clubId.trim();
			const res = await fetch('/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(settings)
			});
			if (!res.ok) throw new Error('Speichern fehlgeschlagen');
			window.location.href = '/teams';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unbekannter Fehler';
			saving = false;
		}
	}
</script>

<div class="min-h-screen bg-[#0b0e1a] flex items-center justify-center p-4">
	<div class="bg-[#151929] rounded-2xl p-8 w-full max-w-md shadow-xl">
		<h1 class="text-2xl font-bold text-white mb-2">{isEditing ? 'Vereinseinstellungen' : 'Scoring Setup'}</h1>
		<p class="text-gray-400 mb-6">{isEditing ? 'Einstellungen bearbeiten' : 'Verein einmalig konfigurieren'}</p>

		{#if error}
			<div class="bg-red-900/30 border border-red-700 text-red-300 rounded-lg p-3 mb-4 text-sm">{error}</div>
		{/if}

		<form onsubmit={(e) => { e.preventDefault(); submit(); }} class="space-y-4">
			<div>
				<label for="clubName" class="block text-sm font-medium text-gray-300 mb-1">Vereinsname</label>
				<input
					id="clubName"
					type="text"
					bind:value={clubName}
					placeholder="z.B. VBC Thun"
					class="w-full bg-[#0b0e1a] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
				/>
			</div>

			<div>
				<label for="clubSearch" class="block text-sm font-medium text-gray-300 mb-1">Swiss Volley Club <span class="text-gray-500">(optional)</span></label>
				<div class="relative">
					<input
						id="clubSearch"
						type="text"
						bind:value={clubSearch}
						oninput={onSearchInput}
						placeholder="Club suchen oder ID eingeben..."
						class="w-full bg-[#0b0e1a] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
					/>
					{#if searching}
						<div class="absolute right-3 top-3 text-gray-500 text-xs">...</div>
					{/if}
					{#if clubResults.length > 0}
						<div class="absolute z-10 w-full mt-1 bg-[#1a2035] border border-gray-700 rounded-lg overflow-hidden shadow-xl max-h-48 overflow-y-auto">
							{#each clubResults as club}
								<button
									type="button"
									onclick={() => selectClub(club)}
									class="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-[#252d45] transition-colors"
								>
									{club.name} <span class="text-gray-500 text-xs">({club.id})</span>
								</button>
							{/each}
						</div>
					{/if}
				</div>
				<div class="mt-2">
					<label for="clubId" class="block text-xs text-gray-500 mb-1">Club-ID {clubId ? `(${clubId})` : ''}</label>
					<input
						id="clubId"
						type="text"
						bind:value={clubId}
						placeholder="z.B. 12345"
						class="w-full bg-[#0b0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
					/>
				</div>
				<p class="text-xs text-gray-500 mt-1">Für automatischen Team-/Spielplan-Sync</p>
			</div>

			<button
				type="submit"
				disabled={saving}
				class="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 transition-colors"
			>
				{saving ? 'Speichern...' : isEditing ? 'Speichern' : 'Einrichten'}
			</button>

			{#if isEditing}
				<a href="/teams" class="block text-center text-sm text-gray-500 hover:text-gray-300 mt-2">Abbrechen</a>
			{/if}
		</form>

		<div class="mt-6 pt-4 border-t border-gray-800">
			<a href="/control" class="text-sm text-gray-500 hover:text-gray-300">Legacy Control Panel &rarr;</a>
		</div>
	</div>
</div>
