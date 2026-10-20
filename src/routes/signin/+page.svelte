<script lang="ts">
	import { signIn } from '@auth/sveltekit/client';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import type { PageData } from './$types';
	import LandingNav from '$lib/components/landing/LandingNav.svelte';
	import Logo from '$lib/components/brand/Logo.svelte';

	let lang = $state<'de' | 'en'>('de');

	let { data }: { data: PageData } = $props();

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let errorMsg = $state(
		untrack(() =>
			data.error === 'CredentialsSignin'
				? 'Ungültige E-Mail oder Passwort.'
				: data.error === 'OrgNotFound'
					? 'Organisation konnte nicht geladen werden. Bitte erneut anmelden.'
					: data.error === 'SessionExpired'
						? 'Sitzung abgelaufen. Bitte erneut anmelden.'
						: ''
		)
	);
	let successMsg = $state(untrack(() => (data.registered ? 'Konto erstellt. Bitte melden Sie sich an.' : '')));

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		loading = true;
		errorMsg = '';
		const result = await signIn('credentials', {
			email,
			password,
			redirect: false,
			callbackUrl: data.callbackUrl
		});
		if (result?.error) {
			errorMsg = 'Ungültige E-Mail oder Passwort.';
			loading = false;
		} else if (result?.url) {
			await goto(result.url);
		}
	}
</script>

<LandingNav {lang} onLangToggle={() => { lang = lang === 'de' ? 'en' : 'de'; }} basePath="/" />

<div class="page-bg">
	<Logo variant="stacked" class="logo" />

	{#if successMsg}
		<div class="alert alert-success">{successMsg}</div>
	{/if}
	{#if errorMsg}
		<div class="alert alert-error">{errorMsg}</div>
	{/if}

	<form onsubmit={handleSubmit}>
		<label class="field">
			<span class="label k-mono">E-Mail / Benutzername</span>
			<input
				class="input"
				type="text"
				bind:value={email}
				autocomplete="username"
				required
			/>
		</label>
		<label class="field">
			<span class="label k-mono">Passwort</span>
			<input
				class="input"
				type="password"
				bind:value={password}
				autocomplete="current-password"
				required
			/>
		</label>

		<div class="actions">
			<button type="submit" disabled={loading}>
				{loading ? '…' : 'Anmelden'}
			</button>
			<div class="forgot">
				<a href="{data.kcIssuer}/login-actions/reset-credentials?client_id=scoring-app">
					Passwort vergessen?
				</a>
			</div>
		</div>
	</form>

	<p class="signup-link">
		Noch kein Konto? <a href="/signup">Registrieren</a>
	</p>
</div>

<style>
	.page-bg {
		min-height: 100vh;
		background: var(--k-surface);
		color: var(--k-text);
		font-family: var(--font-sans);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 6rem var(--grid-margin) 3rem;
	}

	.page-bg :global(.logo) {
		height: 120px;
		width: auto;
		color: var(--k-text);
		margin-bottom: 2.5rem;
	}

	.alert {
		width: 100%;
		max-width: 400px;
		font-size: 0.875rem;
		padding: 0.75rem 1rem;
		border-radius: 0;
		border: 1px solid var(--k-line);
		margin-bottom: 1rem;
	}
	.alert-error {
		border-color: var(--color-error);
		color: var(--color-error);
	}
	.alert-success {
		border-color: var(--color-success);
		color: var(--color-success);
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
		max-width: 400px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.label {
		font-size: 13px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--k-text-dim);
	}
	.input {
		width: 100%;
		background: var(--k-surface-alt);
		border: 1px solid var(--k-line);
		border-radius: 0;
		color: var(--k-text);
		font-family: var(--font-sans);
		font-weight: var(--type-wght-regular);
		font-size: 16px;
		padding: 14px 16px;
		transition: border-color var(--dur-fast) var(--ease-snap);
	}
	.input:hover {
		border-color: var(--k-text-mute);
	}
	.input:focus {
		outline: none;
		border-color: var(--color-focus);
		box-shadow: 0 0 0 1px var(--color-focus);
	}

	.actions {
		margin-top: 0.75rem;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	button[type='submit'] {
		width: 100%;
		background: var(--pulse);
		color: var(--paper);
		font-size: 16px;
		font-weight: var(--type-wght-medium);
		font-family: inherit;
		padding: 0.875rem 1rem;
		border: none;
		border-radius: 999px;
		cursor: pointer;
		transition:
			background var(--dur-fast) var(--ease-snap),
			transform var(--dur-fast) var(--ease-snap);
	}
	button[type='submit']:hover {
		background: var(--pulse-soft);
	}
	button[type='submit']:active {
		transform: scale(1.03, 0.94);
		transform-origin: bottom;
	}
	button[type='submit']:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 3px;
	}
	button[type='submit']:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.forgot {
		text-align: center;
	}
	.forgot a,
	.signup-link a {
		font-size: 0.875rem;
		color: var(--color-link);
		text-decoration: none;
	}
	.forgot a:hover,
	.signup-link a:hover {
		text-decoration: underline;
	}
	.forgot a:focus-visible,
	.signup-link a:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 3px;
	}

	.signup-link {
		margin-top: 2rem;
		font-size: 0.875rem;
		color: var(--k-text-mute);
	}

	@media (max-width: 560px) {
		.page-bg {
			padding: 5.5rem 1rem 2rem;
			justify-content: flex-start;
		}
		.page-bg :global(.logo) {
			height: 96px;
			margin-bottom: 1.75rem;
		}
	}
</style>
