<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { onDestroy } from 'svelte';
	import { loadStripe } from '@stripe/stripe-js';
	import { env } from '$env/dynamic/public';
	import type { PageData } from './$types';

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

<div class="min-h-screen bg-bg-base p-4">
	<div class="max-w-2xl mx-auto">
		<div class="mb-6">
			<h1 class="text-2xl font-bold text-text-primary">Abonnement</h1>
		</div>

		{#if showCheckout}
			<div class="bg-bg-panel-alt rounded-xl p-4 mb-4">
				<div id="stripe-checkout"></div>
			</div>
			<button
				onclick={() => { checkout?.destroy(); checkout = null; showCheckout = false; }}
				class="text-text-tertiary text-sm hover:text-text-secondary"
			>
				← Abbrechen
			</button>
		{:else if data.subscriptionStatus === 'active'}
			<div class="bg-bg-panel-alt rounded-xl p-6 mb-4">
				<div class="flex items-center gap-3 mb-4">
					<span class="text-xs bg-green-900/30 text-green-300 px-3 py-1 rounded-full font-medium">Aktiv</span>
					<p class="text-text-secondary text-sm">Abonnement läuft</p>
				</div>
				<button
					onclick={openPortal}
					disabled={loading}
					class="w-full bg-bg-base hover:bg-bg-panel-hover disabled:opacity-50 text-text-secondary rounded-lg px-4 py-2 transition-colors text-sm"
				>
					Abonnement verwalten
				</button>
			</div>
		{:else if data.subscriptionStatus === 'trialing'}
			<div class="bg-bg-panel-alt rounded-xl p-6 mb-4">
				<div class="mb-4">
					<p class="text-text-primary font-semibold">Testphase aktiv</p>
					<p class="text-text-secondary text-sm mt-1">
						Dein Abo startet automatisch nach Ablauf der Testphase. Du kannst jederzeit kündigen.
					</p>
				</div>
				<button
					onclick={openPortal}
					disabled={loading}
					class="w-full bg-bg-base hover:bg-bg-panel-hover disabled:opacity-50 text-text-secondary rounded-lg px-4 py-2 transition-colors text-sm"
				>
					Abo verwalten
				</button>
			</div>
		{:else if data.subscriptionStatus === null}
			<div class="bg-bg-panel-alt rounded-xl p-6 mb-4">
				<div class="mb-4">
					<p class="text-text-primary font-semibold">Starte deine 3-Tage Gratis-Testphase</p>
				</div>
				<button
					onclick={startCheckout}
					disabled={loading}
					class="w-full bg-accent-mid hover:bg-accent-dark disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-3 transition-colors"
				>
					{loading ? '...' : 'Kostenlos testen — Keine Kosten für 3 Tage'}
				</button>
			</div>
		{:else}
			<div class="bg-bg-panel-alt rounded-xl p-6 mb-4">
				{#if data.subscriptionStatus === 'past_due'}
					<div class="mb-4 bg-red-900/30 text-red-300 rounded-lg px-4 py-2 text-sm">
						Zahlung fehlgeschlagen — bitte Zahlungsmethode aktualisieren.
					</div>
				{:else if data.subscriptionStatus === 'canceled'}
					<div class="mb-4 bg-bg-base text-text-secondary rounded-lg px-4 py-2 text-sm">
						Abonnement gekündigt.
					</div>
				{/if}
				<p class="text-text-secondary text-sm mb-4">
					Deine Testphase ist abgelaufen. Um Scorely weiter zu nutzen, schliesse ein Abo ab.
				</p>
				<button
					onclick={startCheckout}
					disabled={loading}
					class="w-full bg-accent-mid hover:bg-accent-dark disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-3 transition-colors"
				>
					{loading ? '...' : 'Abonnieren'}
				</button>
			</div>
		{/if}
	</div>
</div>
