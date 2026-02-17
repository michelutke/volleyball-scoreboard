<script lang="ts">
	import { DEFAULT_ACCENT } from '$lib/theme.js';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	let isEdit = $derived(!!data.clubName);
	let clubName = $state(data.clubName ?? '');
	let accentColor = $state(data.accentColor ?? DEFAULT_ACCENT);
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
			const payload: Record<string, string> = { clubName: clubName.trim() };
			if (isEdit) {
				payload.accentColor = accentColor;
			}
			const res = await fetch('/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!res.ok) throw new Error('Speichern fehlgeschlagen');
			window.location.href = '/teams';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unbekannter Fehler';
			saving = false;
		}
	}
</script>

<div class="min-h-screen bg-bg-base flex items-center justify-center p-4">
	<div class="bg-bg-panel-alt rounded-2xl p-8 w-full max-w-md shadow-xl">
		<h1 class="text-2xl font-bold text-white mb-2">{isEdit ? 'Einstellungen' : 'Scoring Setup'}</h1>
		<p class="text-text-secondary mb-6">{isEdit ? 'Vereinseinstellungen bearbeiten' : 'Verein einmalig konfigurieren'}</p>

		{#if error}
			<div class="bg-red-900/30 border border-red-700 text-red-300 rounded-lg p-3 mb-4 text-sm">{error}</div>
		{/if}

		<form onsubmit={(e) => { e.preventDefault(); submit(); }} class="space-y-4">
			<div>
				<label for="clubName" class="block text-sm font-medium text-text-primary mb-1">Vereinsname</label>
				<input
					id="clubName"
					type="text"
					bind:value={clubName}
					placeholder="z.B. VBC Thun"
					class="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2.5 text-white placeholder-text-tertiary focus:outline-none focus:border-accent"
				/>
			</div>

			{#if isEdit}
				<div>
					<label for="accentColor" class="block text-sm font-medium text-text-primary mb-1">Akzentfarbe</label>
					<div class="flex items-center gap-3">
						<input
							id="accentColor"
							type="color"
							bind:value={accentColor}
							class="w-10 h-10 rounded-lg border border-border-subtle cursor-pointer bg-transparent"
						/>
						<span class="text-text-secondary text-sm font-mono">{accentColor}</span>
						{#if accentColor !== DEFAULT_ACCENT}
							<button
								type="button"
								onclick={() => { accentColor = DEFAULT_ACCENT; }}
								class="text-xs text-text-tertiary hover:text-text-primary"
							>
								Standard
							</button>
						{/if}
					</div>
				</div>
			{/if}

			<button
				type="submit"
				disabled={saving}
				class="w-full bg-accent-mid hover:bg-accent-dark disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 transition-colors"
			>
				{saving ? 'Speichern...' : isEdit ? 'Speichern' : 'Einrichten'}
			</button>
		</form>

		<div class="mt-6 pt-4 border-t border-border-default flex justify-between">
			{#if isEdit}
				<a href="/teams" class="text-sm text-text-tertiary hover:text-text-primary">&larr; Zurück</a>
			{/if}
			<a href="/control" class="text-sm text-text-tertiary hover:text-text-primary">Legacy Control Panel &rarr;</a>
		</div>
	</div>
</div>
