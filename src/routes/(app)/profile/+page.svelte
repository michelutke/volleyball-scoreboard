<script lang="ts">
	import { page } from '$app/state';
	import KThemeToggle from '$lib/components/k/KThemeToggle.svelte';
	import { KButton } from '$lib/components/k';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

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

<div class="page">
	<div class="wrap">
		<p class="kicker k-mono">Profil · Profile</p>
		<h1 class="title k-display">Profil</h1>

		<section class="card">
			<p class="card-label k-mono">Konto</p>
			{#if page.data.session?.user?.name}
				<div class="row">
					<span class="row-key k-mono">Name</span>
					<span class="row-val">{page.data.session.user.name}</span>
				</div>
			{/if}
			{#if page.data.session?.user?.email}
				<div class="row">
					<span class="row-key k-mono">E-Mail</span>
					<span class="row-val">{page.data.session.user.email}</span>
				</div>
			{/if}
		</section>

		<section class="card">
			<p class="card-label k-mono">Design</p>
			<KThemeToggle />
		</section>

		{#if isAdmin}
			<section class="card">
				<p class="card-label k-mono">Abonnement</p>
				<div class="sub-row">
					{#if subscriptionStatus === 'active'}
						<span class="badge badge-active">Aktiv</span>
					{:else if subscriptionStatus === 'trialing'}
						<span class="badge badge-trial">Testphase</span>
					{:else if subscriptionStatus === 'canceled'}
						<span class="badge badge-mute">Gekündigt</span>
					{:else if subscriptionStatus === 'past_due'}
						<span class="badge badge-error">Zahlung ausstehend</span>
					{:else}
						<span class="badge badge-mute">Kein Abo</span>
					{/if}
					{#if subscriptionStatus === 'active' || subscriptionStatus === 'trialing'}
						<KButton variant="secondary" size="sm" onclick={openBillingPortal} disabled={portalLoading}>
							{portalLoading ? 'Wird geöffnet…' : 'Verwalten'}
						</KButton>
					{/if}
				</div>
			</section>
		{/if}

		<form method="POST" action="/signout" class="signout">
			<KButton variant="ghost" full>Abmelden</KButton>
		</form>
	</div>
</div>

<style>
	.page {
		min-height: 100vh;
		background: var(--k-surface);
		color: var(--k-text);
		padding: 48px var(--grid-margin) 80px;
	}

	.wrap {
		max-width: 640px;
		margin: 0 auto;
	}

	.kicker {
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--k-text-dim);
		margin: 0 0 12px;
	}

	.title {
		font-size: clamp(32px, 5vw, 56px);
		line-height: 1;
		letter-spacing: -0.025em;
		color: var(--k-text);
		margin: 0 0 32px;
	}

	.card {
		background: var(--k-surface-alt);
		border: 1px solid var(--k-line);
		padding: 20px 24px;
		margin-bottom: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.card-label {
		font-size: 10px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--k-text-dim);
		margin: 0;
	}

	.row {
		display: flex;
		align-items: baseline;
		gap: 16px;
		padding: 8px 0;
		border-bottom: 1px solid color-mix(in srgb, var(--k-line) 50%, transparent);
	}
	.row:last-child {
		border-bottom: none;
	}

	.row-key {
		font-size: 11px;
		letter-spacing: 0.1em;
		color: var(--k-text-mute);
		min-width: 80px;
	}

	.row-val {
		flex: 1;
		font-size: 14px;
		color: var(--k-text);
	}

	.sub-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	.badge {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		padding: 4px 10px;
		border: 1px solid var(--k-line);
		color: var(--k-text-dim);
	}
	.badge-active {
		color: var(--paper);
		background: var(--pulse);
		border-color: var(--pulse);
	}
	.badge-trial {
		color: var(--cool);
		border-color: var(--cool);
	}
	.badge-error {
		color: var(--color-error);
		border-color: var(--color-error);
	}

	.signout {
		margin-top: 8px;
	}
</style>
