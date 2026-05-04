<script lang="ts">
	import { untrack } from 'svelte';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { DEFAULT_ACCENT } from '$lib/theme.js';
	import type { PageData } from './$types.js';
	import { KSection, KButton, KInput, KField } from '$lib/components/k';

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
			const payload: Record<string, string> = { clubName: clubName.trim(), accentColor };
			if (swissVolleyApiKey) payload.swissVolleyApiKey = swissVolleyApiKey;
			const res = await fetch('/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!res.ok) throw new Error('Speichern fehlgeschlagen');
			await invalidate('app:settings');
			await goto(isEdit ? '/' : '/teams');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unbekannter Fehler';
			saving = false;
		}
	}

	async function copyOverlay() {
		if (data.overlaySlug) {
			await navigator.clipboard.writeText(`${page.url.origin}/overlay/${data.overlaySlug}`);
		}
	}
</script>

<div class="page">
	<KSection
		kicker={isEdit ? '— Konfiguration / Settings' : '— Erste Schritte / Setup'}
		title={isEdit ? 'Einstellungen' : 'Einrichten'}
		subtitle={isEdit ? undefined : 'Willkommen! Konfiguriere deinen Verein, um loszulegen.'}
	>
		{#if error}
			<div class="banner-error" role="alert">{error}</div>
		{/if}

		<form
			class="form"
			onsubmit={(e) => {
				e.preventDefault();
				submit();
			}}
		>
			<div class="panel">
				<h2 class="panel-label k-mono">— Vereinsname</h2>
				<KField label="Vereinsname" for="clubName" required>
					<KInput id="clubName" type="text" bind:value={clubName} placeholder="z.B. VBC Thun" />
				</KField>
			</div>

			{#if data.isAdmin}
				<div class="panel">
					<h2 class="panel-label k-mono">— Swiss Volley</h2>
					<div class="hint-row">
						<button
							type="button"
							class="info-btn"
							onclick={() => (showApiKeyInfo = !showApiKeyInfo)}
							aria-label="Anleitung anzeigen"
						>ℹ</button>
						<span class="hint">
							{data.swissVolleyApiKeySet ? 'API-Key ist konfiguriert' : 'Optional — Mannschaften automatisch aus Swiss Volley importieren'}
						</span>
					</div>
					{#if showApiKeyInfo}
						<div class="info-panel">
							Im Volleymanager als Vereins-Admin anmelden → Administration → Club → Webservice/Api → API-Key für deinen Verein kopieren und hier einfügen.
						</div>
					{/if}
					<KField label="Swiss Volley API-Key" for="svApiKey">
						<KInput
							id="svApiKey"
							type="password"
							bind:value={swissVolleyApiKey}
							placeholder={data.swissVolleyApiKeySet ? '••••••••' : 'API-Key eingeben'}
							autocomplete="off"
						/>
					</KField>
				</div>
			{/if}

			{#if isEdit && data.overlaySlug}
				<div class="panel">
					<h2 class="panel-label k-mono">— Overlay Permalink</h2>
					<div class="overlay-row">
						<KInput
							id="overlayUrl"
							type="text"
							readonly
							value="{page.url.origin}/overlay/{data.overlaySlug}"
						/>
						<KButton variant="secondary" size="md" onclick={copyOverlay}>Kopieren</KButton>
					</div>
				</div>
			{/if}

			{#if isEdit}
				<div class="panel">
					<h2 class="panel-label k-mono">— Akzentfarbe</h2>
					<div class="color-row">
						<input id="accentColor" type="color" bind:value={accentColor} class="color-swatch" />
						<span class="color-hex k-mono">{accentColor}</span>
						{#if accentColor !== DEFAULT_ACCENT}
							<KButton variant="ghost" size="sm" onclick={() => (accentColor = DEFAULT_ACCENT)}>
								Standard
							</KButton>
						{/if}
					</div>
				</div>
			{/if}

			<KButton variant="primary" size="lg" full disabled={saving}>
				{saving ? 'Speichern...' : isEdit ? 'Speichern' : 'Einrichten'}
			</KButton>
		</form>
	</KSection>
</div>

<style>
	.page {
		min-height: 100vh;
		background: var(--k-surface);
		color: var(--k-text);
	}

	.banner-error {
		font-size: 13px;
		padding: 12px 14px;
		background: color-mix(in srgb, var(--color-error) 10%, transparent);
		border: 1px solid var(--color-error);
		color: var(--color-error-light);
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: 24px;
		max-width: 720px;
	}

	.panel {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 28px;
		background: var(--k-surface-alt);
		border: 1px solid var(--k-line);
	}

	.panel-label {
		font-size: 11px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--k-text-dim);
		margin: 0;
	}

	.hint-row {
		display: inline-flex;
		gap: 8px;
		align-items: center;
	}

	.hint {
		font-size: 12px;
		color: var(--k-text-dim);
	}

	.info-btn {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		font-size: 11px;
		font-weight: 700;
		background: var(--k-line);
		color: var(--k-text-mute);
		border: none;
		cursor: pointer;
		line-height: 1;
		flex-shrink: 0;
	}

	.info-panel {
		font-size: 13px;
		color: var(--k-text-mute);
		background: var(--k-surface);
		border: 1px solid var(--k-line);
		border-left: 2px solid var(--cool);
		padding: 12px 14px;
		line-height: 1.5;
	}

	.overlay-row {
		display: flex;
		gap: 10px;
		align-items: stretch;
	}
	.overlay-row :global(.k-input) {
		font-family: var(--font-mono);
		font-size: 13px;
	}

	.color-row {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.color-swatch {
		width: 44px;
		height: 44px;
		border: 1px solid var(--k-line);
		background: transparent;
		cursor: pointer;
		padding: 2px;
	}

	.color-hex {
		font-size: 13px;
		color: var(--k-text-mute);
	}
</style>
