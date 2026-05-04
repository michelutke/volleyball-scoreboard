<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { onDestroy } from 'svelte';
	import { loadStripe } from '@stripe/stripe-js';
	import { env } from '$env/dynamic/public';
	import type { ActionData } from './$types';
	import LandingNav from '$lib/components/landing/LandingNav.svelte';
	import { KButton, KInput, KField } from '$lib/components/k';

	let { form }: { form: ActionData } = $props();

	let lang = $state<'de' | 'en'>('de');
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

<LandingNav {lang} onLangToggle={() => (lang = lang === 'de' ? 'en' : 'de')} basePath="/" />

<div class="page">
	<div class="wrap" class:wide={step === 'checkout'}>
		{#if step === 'checkout'}
			<header class="head">
				<p class="kicker k-mono">Schritt 02 · Zahlung</p>
				<h1 class="title k-display">Zahlungsdetails</h1>
				<p class="sub">3 Tage kostenlos. Erst danach wird abgebucht. Jederzeit kündbar.</p>
			</header>
			<div class="panel checkout">
				{#if checkoutError}
					<div class="banner-error">{checkoutError}</div>
				{:else}
					<div id="stripe-checkout"></div>
				{/if}
			</div>
		{:else}
			<header class="head">
				<p class="kicker k-mono">Schritt 01 · Konto</p>
				<h1 class="title k-display">Konto erstellen.</h1>
				<p class="sub">3 Tage kostenlos testen. Keine Kreditkarte für den Start nötig.</p>
			</header>

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
				class="panel"
			>
				{#if form?.error}
					<div class="banner-error">{form.error}</div>
				{/if}

				<div class="row two">
					<KField label="Vorname" for="firstName" required>
						<KInput id="firstName" name="firstName" type="text" required autocomplete="given-name" />
					</KField>
					<KField label="Nachname" for="lastName" required>
						<KInput id="lastName" name="lastName" type="text" required autocomplete="family-name" />
					</KField>
				</div>

				<KField label="Benutzername" for="username" required hint="3 bis 30 Zeichen, nur Buchstaben, Zahlen, ., _, -">
					<KInput id="username" name="username" type="text" required autocomplete="username" />
				</KField>

				<KField label="E-Mail" for="email" required>
					<KInput id="email" name="email" type="email" required autocomplete="email" bind:value={email} />
				</KField>

				<KField label="Passwort" for="password" required hint="Mindestens 8 Zeichen">
					<KInput
						id="password"
						name="password"
						type="password"
						required
						minlength={8}
						autocomplete="new-password"
						bind:value={password}
					/>
				</KField>

				<KField
					label="Passwort bestätigen"
					for="confirmPassword"
					required
					error={passwordMismatch ? 'Passwörter stimmen nicht überein' : undefined}
				>
					<KInput
						id="confirmPassword"
						name="confirmPassword"
						type="password"
						required
						autocomplete="new-password"
						bind:value={confirmPassword}
					/>
				</KField>

				<KButton variant="primary" size="lg" full disabled={loading || passwordMismatch}>
					{loading ? '...' : 'Kostenlos starten'}
				</KButton>
			</form>

			<p class="below k-mono">
				Bereits registriert? <a href="/signin" class="link">Anmelden</a>
			</p>
		{/if}
	</div>
</div>

<style>
	.page {
		min-height: 100vh;
		background: var(--k-surface);
		color: var(--k-text);
		padding: 120px var(--grid-margin) 60px;
		display: flex;
		justify-content: center;
	}

	.wrap {
		width: 100%;
		max-width: 480px;
		display: flex;
		flex-direction: column;
		gap: 32px;
	}
	.wrap.wide {
		max-width: 720px;
	}

	.head {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.kicker {
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--pulse);
		margin: 0;
	}

	.title {
		font-family: var(--font-display);
		font-weight: var(--type-wght-display);
		font-size: clamp(36px, 5vw, 56px);
		line-height: 0.95;
		letter-spacing: -0.025em;
		margin: 0;
	}

	.sub {
		font-size: 15px;
		color: var(--k-text-mute);
		margin: 0;
	}

	.panel {
		display: flex;
		flex-direction: column;
		gap: 18px;
		padding: 32px;
		background: var(--k-surface-alt);
		border: 1px solid var(--k-line);
	}

	.checkout {
		padding: 24px;
	}

	.row.two {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}
	@media (max-width: 480px) {
		.row.two {
			grid-template-columns: 1fr;
		}
	}

	.banner-error {
		font-size: 13px;
		padding: 12px 14px;
		background: color-mix(in srgb, var(--color-error) 10%, transparent);
		border: 1px solid var(--color-error);
		color: var(--color-error-light);
	}

	.below {
		font-size: 12px;
		letter-spacing: 0.06em;
		color: var(--k-text-dim);
		text-align: center;
		margin: 0;
	}
	.link {
		color: var(--pulse);
		text-decoration: none;
	}
	.link:hover {
		text-decoration: underline;
	}
</style>
