<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	const raw = $derived(page.url.searchParams.get('callbackUrl') ?? '/');
	const callbackUrl = $derived((() => {
		try {
			const u = new URL(raw);
			const p = u.pathname;
			return p.startsWith('/signin') ? '/' : p;
		} catch {
			return raw.startsWith('/') && !raw.startsWith('/signin') ? raw : '/';
		}
	})());

	let formEl: HTMLFormElement | null = null;
	onMount(() => { formEl?.submit(); });
</script>

<form bind:this={formEl} method="POST">
	<input type="hidden" name="provider" value="keycloak" />
	<input type="hidden" name="callbackUrl" value={callbackUrl} />
	<noscript><button type="submit">Anmelden</button></noscript>
</form>
