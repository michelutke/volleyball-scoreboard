<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { onDestroy } from 'svelte';
	import { loadStripe } from '@stripe/stripe-js';
	import { env } from '$env/dynamic/public';
	import type { PageData } from './$types';
	import { KSection, KButton } from '$lib/components/k';

	let { data }: { data: PageData } = $props();
	let loading = $state(false);
	let showCheckout = $state(false);
	let sessionId = $state('');
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let checkout = $state<any>(null);

	async function startCheckout() {
		loading = true;
		try {
			const res = await fetch('/api/billing/checkout', { method: 'POST' });
			if (!res.ok) return;
			const { clientSecret, sessionId: sid } = await res.json();
			if (!clientSecret) return;
			sessionId = sid;
			showCheckout = true;

			const publishableKey = env.PUBLIC_STRIPE_PUBLISHABLE_KEY;
			if (!publishableKey) return;
			const stripe = await loadStripe(publishableKey);
			if (!stripe) return;

			checkout = await stripe.initEmbeddedCheckout({
				clientSecret,
				onComplete: async () => {
					await fetch('/api/billing/verify-session', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ sessionId })
					});
					checkout?.destroy();
					checkout = null;
					showCheckout = false;
					await invalidateAll();
				}
			});
			checkout.mount('#stripe-checkout');
		} finally {
			loading = false;
		}
	}

	async function openPortal() {
		loading = true;
		try {
			const res = await fetch('/api/billing/portal', { method: 'POST' });
			if (!res.ok) return;
			const { url } = await res.json();
			if (url) window.location.href = url;
		} finally {
			loading = false;
		}
	}

	onDestroy(() => {
		checkout?.destroy();
	});
</script>

<div class="page">
	<KSection kicker="Konto · Abrechnung" title="Abonnement" subtitle="Plan, Zahlung und Status für deine Organisation.">
		{#if showCheckout}
			<div class="panel checkout-panel">
				<div id="stripe-checkout"></div>
			</div>
			<KButton
				variant="ghost"
				onclick={() => {
					checkout?.destroy();
					checkout = null;
					showCheckout = false;
				}}
			>
				← Abbrechen
			</KButton>
		{:else if data.subscriptionStatus === 'active'}
			<div class="panel">
				<div class="status-row">
					<span class="badge badge-active k-mono">Aktiv</span>
					<p class="status-text">Abonnement läuft.</p>
				</div>
				<KButton variant="secondary" full onclick={openPortal} disabled={loading}>
					Abonnement verwalten
				</KButton>
			</div>
		{:else if data.subscriptionStatus === 'trialing'}
			<div class="panel">
				<div class="status-row">
					<span class="badge badge-trial k-mono">Testphase</span>
					<p class="status-text">
						Dein Abo startet automatisch nach Ablauf der Testphase. Du kannst jederzeit kündigen.
					</p>
				</div>
				<KButton variant="secondary" full onclick={openPortal} disabled={loading}>
					Abo verwalten
				</KButton>
			</div>
		{:else if data.subscriptionStatus === null}
			<div class="panel">
				<p class="title-text">Starte deine 3-Tage Gratis-Testphase.</p>
				<p class="status-text">Keine Kosten für 3 Tage. Erst danach wird abgebucht.</p>
				<KButton variant="primary" size="lg" full onclick={startCheckout} disabled={loading}>
					{loading ? '...' : 'Kostenlos testen'}
				</KButton>
			</div>
		{:else}
			<div class="panel">
				{#if data.subscriptionStatus === 'past_due'}
					<div class="banner-error">Zahlung fehlgeschlagen. Bitte Zahlungsmethode aktualisieren.</div>
				{:else if data.subscriptionStatus === 'canceled'}
					<div class="banner-neutral">Abonnement gekündigt.</div>
				{/if}
				<p class="status-text">
					Deine Testphase ist abgelaufen. Um Scorely weiter zu nutzen, schliesse ein Abo ab.
				</p>
				<KButton variant="primary" size="lg" full onclick={startCheckout} disabled={loading}>
					{loading ? '...' : 'Abonnieren'}
				</KButton>
			</div>
		{/if}
	</KSection>
</div>

<style>
	.page {
		min-height: 100vh;
		background: var(--k-surface);
		color: var(--k-text);
	}

	.panel {
		display: flex;
		flex-direction: column;
		gap: 18px;
		padding: 28px;
		background: var(--k-surface-alt);
		border: 1px solid var(--k-line);
	}

	.checkout-panel {
		padding: 16px;
	}

	.status-row {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.badge {
		font-size: 11px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		padding: 4px 10px;
		align-self: flex-start;
		border: 1px solid currentColor;
	}
	.badge-active {
		color: var(--color-success);
	}
	.badge-trial {
		color: #eab308;
	}

	.title-text {
		font-family: var(--font-display);
		font-weight: var(--type-wght-bold);
		font-size: 22px;
		margin: 0;
		color: var(--k-text);
		letter-spacing: -0.01em;
	}

	.status-text {
		font-size: 14px;
		color: var(--k-text-mute);
		margin: 0;
	}

	.banner-error {
		font-size: 13px;
		padding: 12px 14px;
		background: color-mix(in srgb, var(--color-error) 10%, transparent);
		border: 1px solid var(--color-error);
		color: var(--color-error-light);
	}

	.banner-neutral {
		font-size: 13px;
		padding: 12px 14px;
		background: var(--k-surface);
		border: 1px solid var(--k-line);
		color: var(--k-text-mute);
	}
</style>
