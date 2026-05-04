<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		href?: string;
		onclick?: (e: MouseEvent) => void;
		children: Snippet;
	}

	let { href, onclick, children }: Props = $props();
</script>

{#if href}
	<a {href} class="k-row" {onclick}>
		<span class="k-row-bar" aria-hidden="true"></span>
		<span class="k-row-body">{@render children()}</span>
	</a>
{:else if onclick}
	<button class="k-row k-row-button" {onclick}>
		<span class="k-row-bar" aria-hidden="true"></span>
		<span class="k-row-body">{@render children()}</span>
	</button>
{:else}
	<div class="k-row">
		<span class="k-row-bar" aria-hidden="true"></span>
		<span class="k-row-body">{@render children()}</span>
	</div>
{/if}

<style>
	.k-row {
		position: relative;
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 16px 20px;
		text-decoration: none;
		color: var(--k-text);
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--k-line);
		width: 100%;
		text-align: left;
		font: inherit;
		cursor: default;
		transition: background var(--dur-fast) var(--ease-snap);
	}
	a.k-row,
	button.k-row {
		cursor: pointer;
	}
	a.k-row:hover,
	button.k-row:hover {
		background: color-mix(in srgb, var(--k-text) 3%, transparent);
	}
	a.k-row:hover .k-row-bar,
	button.k-row:hover .k-row-bar {
		transform: scaleX(1);
	}
	a.k-row:hover .k-row-body,
	button.k-row:hover .k-row-body {
		transform: translateX(4px);
	}

	.k-row-bar {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 3px;
		background: var(--pulse);
		transform: scaleX(0);
		transform-origin: left;
		transition: transform var(--dur-mid) var(--ease-snap);
	}

	.k-row-body {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 16px;
		transition: transform var(--dur-mid) var(--ease-snap);
	}
</style>
