<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { onDestroy } from 'svelte';
	import { loadStripe } from '@stripe/stripe-js';
	import { env } from '$env/dynamic/public';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let loading = $state(false);
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let passwordMismatch = $derived(confirmPassword.length > 0 && password !== confirmPassword);

	let step = $state<'form' | 'checkout'>('form');
	let clientSecret = $state('');
	let sessionId = $state('');
	let checkoutError = $state('');
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let checkout = $state<any>(null);

	async function mountCheckout(secret: string) {
		const publishableKey = env.PUBLIC_STRIPE_PUBLISHABLE_KEY;
		if (!publishableKey) {
			checkoutError = 'Stripe publishable key not configured.';
			return;
		}
		const stripe = await loadStripe(publishableKey);
		if (!stripe) return;
		checkout = await stripe.initEmbeddedCheckout({
			clientSecret: secret,
			onComplete: async () => {
				try {
					const res = await fetch('/api/auth/auto-login', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ email, password, sessionId })
					});
					const data: { ok: boolean; redirectUrl: string } = await res.json();
					await goto(data.ok ? '/dashboard' : `/signin?registered=1`);
				} catch {
					await goto('/signin?registered=1');
				}
			}
		});
		checkout.mount('#stripe-checkout');
	}

	$effect(() => {
		if (step === 'checkout' && clientSecret) {
			mountCheckout(clientSecret);
		}
	});

	onDestroy(() => {
		checkout?.destroy();
	});
</script>

<div class="min-h-screen bg-bg-base flex items-center justify-center p-4">
	<div class="w-full {step === 'checkout' ? 'max-w-2xl' : 'max-w-md'}">
		{#if step === 'checkout'}
			<div class="mb-6 text-center">
				<h1 class="text-2xl font-bold text-text-primary">Zahlungsdetails eingeben</h1>
				<p class="text-text-secondary mt-1 text-sm">3 Tage kostenlos — danach CHF/Monat</p>
			</div>
			<div class="bg-bg-panel-alt rounded-xl p-4">
				{#if checkoutError}
					<div class="bg-red-900/30 text-red-300 rounded-lg px-4 py-2 text-sm">{checkoutError}</div>
				{:else}
					<div id="stripe-checkout"></div>
				{/if}
			</div>
		{:else}
			<div class="mb-8 text-center">
				<h1 class="text-3xl font-bold text-text-primary">Konto erstellen</h1>
				<p class="text-text-secondary mt-2">3 Tage kostenlos testen</p>
			</div>

			<form
				method="POST"
				use:enhance={() => {
					loading = true;
					return async ({ result, update }) => {
						if (result.type === 'success' && result.data?.clientSecret) {
							clientSecret = result.data.clientSecret as string;
							sessionId = result.data.sessionId as string;
							step = 'checkout';
							loading = false;
							return;
						}
						if (result.type === 'success' && !result.data?.clientSecret) {
							await goto('/signin?callbackUrl=/dashboard');
							return;
						}
						await update();
						loading = false;
					};
				}}
				class="bg-bg-panel-alt rounded-xl p-6 space-y-4"
			>
				{#if form?.error}
					<div class="bg-red-900/30 text-red-300 rounded-lg px-4 py-2 text-sm">{form.error}</div>
				{/if}

				<div>
					<label class="block text-xs text-text-tertiary mb-1" for="firstName">Vorname</label>
					<input
						id="firstName"
						name="firstName"
						type="text"
						required
						autocomplete="given-name"
						class="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2 text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent"
					/>
				</div>

				<div>
					<label class="block text-xs text-text-tertiary mb-1" for="lastName">Nachname</label>
					<input
						id="lastName"
						name="lastName"
						type="text"
						required
						autocomplete="family-name"
						class="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2 text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent"
					/>
				</div>

				<div>
					<label class="block text-xs text-text-tertiary mb-1" for="username">Benutzername</label>
					<input
						id="username"
						name="username"
						type="text"
						required
						autocomplete="username"
						class="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2 text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent"
					/>
				</div>

				<div>
					<label class="block text-xs text-text-tertiary mb-1" for="email">E-Mail</label>
					<input
						id="email"
						name="email"
						type="email"
						required
						autocomplete="email"
						bind:value={email}
						class="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2 text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent"
					/>
				</div>

				<div>
					<label class="block text-xs text-text-tertiary mb-1" for="password">Passwort</label>
					<input
						id="password"
						name="password"
						type="password"
						required
						minlength="8"
						autocomplete="new-password"
						bind:value={password}
						class="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2 text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent"
					/>
				</div>

				<div>
					<label class="block text-xs text-text-tertiary mb-1" for="confirmPassword">Passwort bestätigen</label>
					<input
						id="confirmPassword"
						name="confirmPassword"
						type="password"
						required
						autocomplete="new-password"
						bind:value={confirmPassword}
						class="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2 text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent {passwordMismatch ? 'border-red-500' : ''}"
					/>
					{#if passwordMismatch}
						<p class="text-red-400 text-xs mt-1">Passwörter stimmen nicht überein</p>
					{/if}
				</div>

				<button
					type="submit"
					disabled={loading || passwordMismatch}
					class="w-full bg-accent-mid hover:bg-accent-dark disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-3 transition-colors"
				>
					{loading ? '...' : 'Kostenlos starten'}
				</button>
			</form>

			<p class="text-center text-text-tertiary text-sm mt-4">
				Bereits registriert? <a href="/signin" class="text-accent hover:underline">Anmelden</a>
			</p>
		{/if}
	</div>
</div>
