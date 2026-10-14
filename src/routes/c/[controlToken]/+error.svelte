<script lang="ts">
	import { page } from '$app/state';

	const expired = $derived(page.status === 404 || page.status === 410);
</script>

<svelte:head>
	<title>Scorely</title>
</svelte:head>

<main class="flex min-h-screen items-center justify-center bg-gray-900 px-4 text-center text-white">
	<div class="max-w-sm space-y-3">
		{#if expired}
			<h1 class="text-2xl font-bold">Link nicht mehr gültig</h1>
			<p class="text-gray-300">
				Das Spiel ist beendet oder es wurde ein neuer Freigabe-Link erstellt. Bitte frag die Person,
				die das Spiel streamt, nach dem aktuellen Link.
			</p>
		{:else}
			<h1 class="text-2xl font-bold">Etwas ist schiefgelaufen</h1>
			<p class="text-gray-300">{page.error?.message ?? 'Bitte versuche es später erneut.'}</p>
		{/if}
	</div>
</main>
