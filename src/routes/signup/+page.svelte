<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let loading = $state(false);
</script>

<div class="min-h-screen bg-bg-base flex items-center justify-center p-4">
	<div class="w-full max-w-md">
		<div class="mb-8 text-center">
			<h1 class="text-3xl font-bold text-text-primary">Konto erstellen</h1>
			<p class="text-text-secondary mt-2">3 Tage kostenlos testen</p>
		</div>

		{#if form?.success}
			<div class="bg-bg-panel-alt rounded-xl p-8 text-center">
				<p class="text-2xl mb-2">✉️</p>
				<p class="text-text-primary font-semibold text-lg">E-Mail gesendet</p>
				<p class="text-text-secondary mt-2 text-sm">Prüfe dein Postfach und setze dein Passwort.</p>
			</div>
		{:else}
			<form
				method="POST"
				use:enhance={() => {
					loading = true;
					return async ({ result, update }) => {
						if (result.type === 'success' && result.data?.checkoutUrl) {
							window.location.href = result.data.checkoutUrl as string;
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
					<label class="block text-xs text-text-tertiary mb-1" for="email">E-Mail</label>
					<input
						id="email"
						name="email"
						type="email"
						required
						autocomplete="email"
						class="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2 text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent"
					/>
				</div>

				<button
					type="submit"
					disabled={loading}
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
