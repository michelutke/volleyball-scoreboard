<script lang="ts">
	import { signIn } from '@auth/sveltekit/client';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import type { PageData } from './$types';

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
					: ''
		)
	);
	let successMsg = $state(untrack(() => (data.registered ? 'Konto erstellt — bitte melden Sie sich an.' : '')));

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

<div class="page-bg">
	<img src="/vbcthun-ball.svg" alt="Scorely" class="logo" />
	<h1 class="title">SCORELY</h1>

	{#if successMsg}
		<div class="alert alert-success">{successMsg}</div>
	{/if}
	{#if errorMsg}
		<div class="alert alert-error">{errorMsg}</div>
	{/if}

	<form onsubmit={handleSubmit}>
		<div class="scoreboard-wrap">
			<div class="scoreboard">
				<div class="row home-row">
					<div class="strip"></div>
					<div class="name-cell">
						<input
							class="name-input"
							type="email"
							bind:value={email}
							placeholder="E-Mail"
							autocomplete="email"
							required
						/>
					</div>
					<div class="sets-cell">2</div>
					<div class="set-cell h-win">25</div>
					<div class="set-cell lose">18</div>
					<div class="set-cell h-win">15</div>
					<div class="points-cell">44</div>
					<div class="timeout-cell">
						<div class="timeout-box used"></div>
						<div class="timeout-box used"></div>
					</div>
				</div>
				<div class="row guest-row">
					<div class="strip"></div>
					<div class="name-cell">
						<input
							class="name-input"
							type="password"
							bind:value={password}
							placeholder="Passwort"
							autocomplete="current-password"
							required
						/>
					</div>
					<div class="sets-cell">1</div>
					<div class="set-cell lose">18</div>
					<div class="set-cell g-win">25</div>
					<div class="set-cell lose">10</div>
					<div class="points-cell">31</div>
					<div class="timeout-cell">
						<div class="timeout-box"></div>
						<div class="timeout-box"></div>
					</div>
				</div>
			</div>
		</div>

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
		background: radial-gradient(ellipse at 20% 0%, #3d0000 0%, #0a0a0a 55%);
		font-family: 'Montserrat', sans-serif;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem 1rem;
		color: #f0f0f0;
	}

	.logo {
		width: 56px;
		height: 56px;
		margin-bottom: 1rem;
		opacity: 0.9;
	}

	.title {
		font-size: clamp(2.5rem, 10vw, 5rem);
		font-weight: 900;
		color: #fff;
		letter-spacing: 0.1em;
		margin-bottom: 2rem;
		text-align: center;
	}

	.alert {
		width: 100%;
		max-width: 680px;
		font-size: 0.875rem;
		padding: 0.625rem 0.875rem;
		border-radius: 0.5rem;
		text-align: center;
		margin-bottom: 1rem;
	}
	.alert-error {
		background: rgba(239, 68, 68, 0.12);
		border: 1px solid rgba(239, 68, 68, 0.3);
		color: #f87171;
	}
	.alert-success {
		background: rgba(34, 197, 94, 0.12);
		border: 1px solid rgba(34, 197, 94, 0.3);
		color: #86efac;
	}

	form {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
	}

	.scoreboard-wrap {
		overflow-x: auto;
		width: 100%;
		max-width: 680px;
	}
	.scoreboard {
		display: flex;
		flex-direction: column;
		gap: 3px;
		min-width: 550px;
	}

	.row {
		display: grid;
		grid-template-columns: 10px minmax(240px, 1fr) 64px 56px 56px 56px 72px 18px;
		height: 64px;
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.name-cell {
		display: flex;
		align-items: center;
		padding: 0 1rem;
	}

	.sets-cell {
		background: #111;
		border-left: 2px solid #333;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		font-weight: 700;
		color: #fff;
	}

	.set-cell {
		background: #141414;
		border-left: 1px solid #333;
		border-bottom: 3px solid transparent;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.9375rem;
		font-weight: 600;
	}
	.h-win {
		color: #fff;
		border-bottom-color: #c0392b;
	}
	.g-win {
		color: #fff;
		border-bottom-color: #4a5568;
	}
	.lose {
		color: rgba(255, 255, 255, 0.4);
	}

	.points-cell {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2rem;
		font-weight: 900;
		color: #fff;
	}

	.timeout-cell {
		border-left: 1px solid #fff;
		display: flex;
		flex-direction: column;
		gap: 3px;
		padding: 8px 3px;
	}
	.timeout-box {
		flex: 1;
		border-radius: 2px;
		background: rgba(255, 255, 255, 0.3);
	}
	.timeout-box.used {
		background: #fff;
	}

	.home-row .strip {
		background: #c0392b;
	}
	.home-row .name-cell {
		background: linear-gradient(to right, #1e0505, #161616);
	}
	.home-row .points-cell {
		background: #c0392b;
	}
	.home-row .timeout-cell {
		background: #c0392b;
	}

	.guest-row .strip {
		background: #4a5568;
	}
	.guest-row .name-cell {
		background: #141414;
	}
	.guest-row .points-cell {
		background: #4a5568;
	}
	.guest-row .timeout-cell {
		background: #4a5568;
	}

	.name-input {
		background: transparent;
		border: none;
		color: #fff;
		font-weight: 300;
		font-size: 22px;
		font-family: 'Montserrat', sans-serif;
		width: 100%;
		outline: none;
	}
	.name-input::placeholder {
		color: rgba(255, 255, 255, 0.4);
	}

	.actions {
		margin-top: 1.5rem;
		width: 100%;
		max-width: 360px;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	button[type='submit'] {
		width: 100%;
		background: #0ea5e9;
		color: #fff;
		font-size: 0.9375rem;
		font-weight: 600;
		font-family: inherit;
		padding: 0.75rem 1rem;
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: opacity 0.15s;
	}
	button[type='submit']:hover {
		opacity: 0.88;
	}
	button[type='submit']:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.forgot {
		text-align: center;
	}
	.forgot a {
		font-size: 0.8125rem;
		color: #888;
		text-decoration: none;
	}
	.forgot a:hover {
		color: #aaa;
	}

	.signup-link {
		margin-top: 1.5rem;
		font-size: 0.8125rem;
		color: #666;
	}
	.signup-link a {
		color: #888;
		text-decoration: none;
	}
	.signup-link a:hover {
		color: #aaa;
	}

	@media (max-width: 560px) {
		.page-bg {
			padding: 2rem 0.75rem;
			justify-content: flex-start;
		}
		.title {
			margin-bottom: 1.25rem;
		}
		.scoreboard {
			min-width: 0;
		}
		.scoreboard-wrap {
			overflow-x: hidden;
		}
		.row {
			grid-template-columns: 8px 1fr 52px 60px 14px;
			height: 56px;
		}
		.row > .set-cell {
			display: none;
		}
		.name-input {
			font-size: 18px;
		}
		.actions {
			max-width: 100%;
		}
	}
</style>
