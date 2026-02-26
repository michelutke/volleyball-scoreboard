<script lang="ts">
	import Nav from '$lib/components/Nav.svelte';
	import type { LayoutData } from './$types.js';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<Nav clubName={data.clubName ?? ''} isAdmin={data.isAdmin ?? false} />
{@render children()}
