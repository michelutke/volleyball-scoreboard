<script lang="ts">
	let clubName = $state('');
	let clubId = $state('');
	let saving = $state(false);
	let error = $state('');

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
		<h1 class="text-2xl font-bold text-white mb-2">Scoring Setup</h1>
		<p class="text-gray-400 mb-6">Verein einmalig konfigurieren</p>

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
				<label for="clubId" class="block text-sm font-medium text-gray-300 mb-1">Swiss Volley Club-ID <span class="text-gray-500">(optional)</span></label>
				<input
					id="clubId"
					type="text"
					bind:value={clubId}
					placeholder="z.B. 12345"
					class="w-full bg-[#0b0e1a] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
				/>
				<p class="text-xs text-gray-500 mt-1">Für automatischen Team-/Spielplan-Sync</p>
			</div>

			<button
				type="submit"
				disabled={saving}
				class="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 transition-colors"
			>
				{saving ? 'Speichern...' : 'Einrichten'}
			</button>
		</form>

		<div class="mt-6 pt-4 border-t border-gray-800">
			<a href="/control" class="text-sm text-gray-500 hover:text-gray-300">Legacy Control Panel &rarr;</a>
		</div>
	</div>
</div>
