<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		href?: string;
		padding?: 'sm' | 'md' | 'lg';
		accent?: boolean;
		children: Snippet;
	}

	let { href, padding = 'md', accent = false, children }: Props = $props();

	const klass = $derived(`k-card k-card-${padding}${accent ? ' k-card-accent' : ''}`);
</script>

{#if href}
	<a {href} class={klass}>
		{@render children()}
	</a>
{:else}
	<div class={klass}>
		{@render children()}
	</div>
{/if}

<style>
	.k-card {
		display: block;
		background: var(--k-surface-alt);
		border: 1px solid var(--k-line);
		color: var(--k-text);
		text-decoration: none;
		position: relative;
		transition:
			border-color var(--dur-mid) var(--ease-snap),
			background var(--dur-mid) var(--ease-snap),
			transform var(--dur-mid) var(--ease-snap);
	}
	a.k-card:hover {
		border-color: var(--k-text-mute);
		background: color-mix(in srgb, var(--k-text) 3%, var(--k-surface-alt));
	}
	.k-card-sm { padding: 16px; }
	.k-card-md { padding: 28px; }
	.k-card-lg { padding: 40px; }

	.k-card-accent {
		border-left: 3px solid var(--pulse);
	}
</style>
