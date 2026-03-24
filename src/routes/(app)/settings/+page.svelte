<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { DEFAULT_ACCENT } from '$lib/theme.js';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	let isEdit = $derived(!!data.clubName);
	let clubName = $state(untrack(() => data.clubName ?? ''));
	let accentColor = $state(untrack(() => data.accentColor ?? DEFAULT_ACCENT));
	let swissVolleyApiKey = $state('');
	let saving = $state(false);
	let error = $state('');
	let showApiKeyInfo = $state(false);

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
			if (swissVolleyApiKey) {
				payload.swissVolleyApiKey = swissVolleyApiKey;
			}
			const res = await fetch('/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!res.ok) throw new Error('Speichern fehlgeschlagen');
			await goto(isEdit ? '/' : '/teams');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unbekannter Fehler';
			saving = false;
		}
	}
</script>

<div class="min-h-screen bg-bg-base p-4">
<div class="{isEdit ? 'max-w-2xl' : 'max-w-xl'} mx-auto">
	<h1 class="text-2xl font-bold text-text-primary mb-6">{isEdit ? 'Einstellungen' : 'Einrichten'}</h1>

	{#if !isEdit}
		<p class="text-text-secondary mb-6">Willkommen! Konfiguriere deinen Verein, um loszulegen.</p>
	{/if}

	{#if error}
		<div class="bg-red-900/30 border border-red-700 text-error-light rounded-lg p-3 mb-4 text-sm">{error}</div>
	{/if}

	<form onsubmit={(e) => { e.preventDefault(); submit(); }}>
		<!-- Panel 1: Vereinsname -->
		<div class="bg-bg-panel-alt rounded-xl p-6 mb-6">
			<h2 class="text-sm font-semibold text-text-tertiary uppercase tracking-wide mb-4">Vereinsname</h2>
			<label for="clubName" class="block text-sm font-medium text-text-primary mb-1">Vereinsname</label>
			<input
				id="clubName"
				type="text"
				bind:value={clubName}
				placeholder="z.B. VBC Thun"
				class="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent"
			/>
		</div>

		<!-- Panel 2: Swiss Volley -->
		{#if data.isAdmin}
			<div class="bg-bg-panel-alt rounded-xl p-6 mb-6">
				<h2 class="text-sm font-semibold text-text-tertiary uppercase tracking-wide mb-4">Swiss Volley</h2>
				<div class="flex items-center gap-2 mb-1">
					<label class="text-sm font-medium text-text-primary" for="svApiKey">Swiss Volley API-Key</label>
					<button
						type="button"
						class="info-btn"
						onclick={() => showApiKeyInfo = !showApiKeyInfo}
						aria-label="Anleitung anzeigen"
					>ℹ</button>
				</div>
				{#if showApiKeyInfo}
					<div class="info-panel">
						Im Volleymanager als Vereins-Admin anmelden → Administration → Club → Webservice/Api → API-Key für deinen Verein kopieren und hier einfügen
					</div>
				{/if}
				{#if data.swissVolleyApiKeySet}
					<p class="text-xs text-text-tertiary mb-1">API-Key ist konfiguriert</p>
				{:else if !isEdit}
					<p class="text-xs text-text-tertiary mb-1">Optional — Mannschaften automatisch aus Swiss Volley importieren</p>
				{/if}
				<input
					id="svApiKey"
					type="password"
					bind:value={swissVolleyApiKey}
					placeholder={data.swissVolleyApiKeySet ? '••••••••' : 'API-Key eingeben'}
					autocomplete="off"
					class="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent"
				/>
			</div>
		{/if}

		<!-- Panel 3: Overlay-Permalink (edit only) -->
		{#if isEdit && data.overlaySlug}
			<div class="bg-bg-panel-alt rounded-xl p-6 mb-6">
				<h2 class="text-sm font-semibold text-text-tertiary uppercase tracking-wide mb-4">Overlay-Permalink</h2>
				<label for="overlayUrl" class="block text-sm font-medium text-text-primary mb-1">Permalink-Overlay URL</label>
				<div class="flex items-center gap-2">
					<input
						id="overlayUrl"
						type="text"
						readonly
						value="{page.url.origin}/overlay/{data.overlaySlug}"
						class="flex-1 bg-bg-base border border-border-subtle rounded-lg px-4 py-2.5 text-text-secondary font-mono text-sm focus:outline-none cursor-default select-all"
					/>
					<button
						type="button"
						onclick={() => navigator.clipboard.writeText(`${page.url.origin}/overlay/${data.overlaySlug}`)}
						class="px-3 py-2.5 bg-bg-panel-alt border border-border-subtle rounded-lg text-text-secondary hover:text-text-primary text-sm transition-colors whitespace-nowrap"
					>
						Kopieren
					</button>
				</div>
			</div>
		{/if}

		<!-- Panel 4: Akzentfarbe (edit only) -->
		{#if isEdit}
			<div class="bg-bg-panel-alt rounded-xl p-6 mb-6">
				<h2 class="text-sm font-semibold text-text-tertiary uppercase tracking-wide mb-4">Akzentfarbe</h2>
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
</div>
</div>

<style>
	.info-btn {
		width: 18px; height: 18px; border-radius: 50%; font-size: 11px; font-weight: 700;
		background: var(--color-bg-panel-hover); color: var(--color-text-tertiary);
		border: 1px solid var(--color-border-subtle); cursor: pointer; line-height: 1;
		flex-shrink: 0;
	}
	.info-panel {
		font-size: 13px; color: var(--color-text-secondary);
		background: var(--color-bg-panel-hover); border: 1px solid var(--color-border-subtle);
		border-radius: 8px; padding: 10px 14px; margin-bottom: 8px; line-height: 1.5;
	}
</style>
