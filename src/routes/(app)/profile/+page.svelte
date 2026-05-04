<script lang="ts">
	import { page } from '$app/state';
	import { getStoredTheme, setStoredTheme } from '$lib/theme.js';
	import type { ThemeMode } from '$lib/theme.js';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let themeMode = $state<ThemeMode>('system');

	$effect(() => {
		themeMode = getStoredTheme();
	});

	const subscriptionStatus = $derived(data.subscriptionStatus);
	const isAdmin = $derived(page.data.session?.user?.roles?.includes('admin') ?? false);
	let portalLoading = $state(false);

	async function openBillingPortal() {
		portalLoading = true;
		try {
			const res = await fetch('/api/billing/portal', { method: 'POST' });
			if (res.ok) {
				const { url } = await res.json();
				window.location.href = url;
			}
		} finally {
			portalLoading = false;
		}
	}
</script>

<div class="min-h-screen p-4" style="background: var(--k-surface); color: var(--k-text);">
<div class="max-w-2xl mx-auto pt-12">
	<p class="kicker k-mono">Profil / Profile</p>
	<h1 class="profile-title k-display">Profil</h1>

	<div class="bg-bg-panel-alt rounded-xl p-6 space-y-4 mb-4">
		{#if page.data.session?.user?.name}
			<div>
				<p class="text-xs text-text-tertiary mb-1">Name</p>
				<p class="text-text-primary">{page.data.session.user.name}</p>
			</div>
		{/if}
		{#if page.data.session?.user?.email}
			<div>
				<p class="text-xs text-text-tertiary mb-1">E-Mail</p>
				<p class="text-text-primary">{page.data.session.user.email}</p>
			</div>
		{/if}
	</div>

	<div class="bg-bg-panel-alt rounded-xl p-6 mb-4">
		<p class="text-sm font-medium text-text-primary mb-3">Design</p>
		<div class="flex gap-1 bg-bg-base rounded-lg p-1">
			{#each [
				{ value: 'system', label: 'System' },
				{ value: 'light', label: 'Hell' },
				{ value: 'dark', label: 'Dunkel' }
			] as opt}
				<button
					type="button"
					onclick={() => { themeMode = opt.value as ThemeMode; setStoredTheme(opt.value as ThemeMode); }}
					class="flex-1 py-2 rounded-md text-sm font-medium transition-colors {themeMode === opt.value ? 'bg-accent-mid text-white' : 'text-text-secondary hover:text-text-primary'}"
				>
					{opt.label}
				</button>
			{/each}
		</div>
	</div>

	{#if isAdmin}
		<div class="bg-bg-panel-alt rounded-xl p-6 mb-4">
			<h2 class="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">Abonnement</h2>
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					{#if subscriptionStatus === 'active'}
						<span class="status-badge badge-active">Aktiv</span>
					{:else if subscriptionStatus === 'trialing'}
						<span class="status-badge badge-trialing">Testphase</span>
					{:else if subscriptionStatus === 'canceled'}
						<span class="status-badge badge-canceled">Gekündigt</span>
					{:else if subscriptionStatus === 'past_due'}
						<span class="status-badge badge-error">Zahlung ausstehend</span>
					{:else}
						<span class="status-badge badge-inactive">Kein Abo</span>
					{/if}
				</div>
				{#if subscriptionStatus === 'active' || subscriptionStatus === 'trialing'}
					<button onclick={openBillingPortal} disabled={portalLoading} class="btn-portal">
						{portalLoading ? 'Wird geöffnet…' : 'Abonnement verwalten'}
					</button>
				{/if}
			</div>
		</div>
	{/if}

	<form method="POST" action="/signout">
		<button type="submit" class="w-full bg-bg-panel-alt hover:bg-bg-panel-hover text-text-secondary rounded-xl p-4 transition-colors">
			Abmelden
		</button>
	</form>
</div>
</div>

<style>
	.kicker {
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--k-text-dim);
		margin: 0 0 12px;
	}
	.profile-title {
		font-family: var(--font-display);
		font-weight: var(--type-wght-display);
		font-size: clamp(32px, 5vw, 56px);
		line-height: 1;
		letter-spacing: -0.025em;
		color: var(--k-text);
		margin: 0 0 32px;
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 0.75rem;
		font-weight: 600;
		padding: 3px 10px;
		border-radius: 9999px;
	}
	.badge-active   { background: rgba(22, 163, 74, 0.2); color: #4ade80; }
	.badge-trialing { background: rgba(234, 179, 8, 0.2); color: #fde047; }
	.badge-canceled { background: rgba(107, 114, 128, 0.2); color: #9ca3af; }
	.badge-error    { background: rgba(239, 68, 68, 0.2); color: #f87171; }
	.badge-inactive { background: rgba(107, 114, 128, 0.15); color: #6b7280; }
	.btn-portal {
		font-size: 0.85rem;
		font-weight: 600;
		padding: 6px 14px;
		border-radius: 8px;
		background: var(--color-bg-panel-hover);
		color: var(--color-text-primary);
		border: 1px solid var(--color-border-subtle);
		cursor: pointer;
		transition: background 0.15s;
	}
	.btn-portal:hover:not(:disabled) { background: var(--color-border-subtle); }
	.btn-portal:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
