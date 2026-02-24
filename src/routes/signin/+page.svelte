<script lang="ts">
	import { page } from '$app/state';

	const error = $derived(page.url.searchParams.get('error'));

	const raw = $derived(page.url.searchParams.get('callbackUrl') ?? '/');
	const callbackUrl = $derived(
		raw.startsWith('/') && !raw.startsWith('/signin') ? raw : '/'
	);
</script>

<svelte:head>
	<title>Anmelden — Volleyball Scoreboard</title>
</svelte:head>

<div class="min-h-screen bg-bg-base flex items-center justify-center p-4">
	<div class="w-full max-w-sm">
		<div class="bg-bg-panel border border-border-default rounded-2xl p-8 flex flex-col items-center gap-6">
			<img src="/vbcthun-ball.svg" alt="VBC Thun" class="w-16 h-16" />

			<div class="text-center">
				<h1 class="text-text-primary text-xl font-semibold">Volleyball Scoreboard</h1>
				<p class="text-text-secondary text-sm mt-1">VBC Thun</p>
			</div>

			{#if error}
				<p class="text-error text-sm text-center">Anmeldung fehlgeschlagen</p>
			{/if}

			<form method="POST" class="w-full">
				<input type="hidden" name="provider" value="keycloak" />
				<input type="hidden" name="callbackUrl" value={callbackUrl} />
				<button
					type="submit"
					class="w-full bg-accent text-bg-base font-medium py-2.5 px-4 rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
				>
					Anmelden
				</button>
			</form>
		</div>
	</div>
</div>
