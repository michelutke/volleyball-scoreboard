<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		numeral?: string;
		title: string;
		body?: string;
		action?: Snippet;
	}

	let { numeral = '00', title, body, action }: Props = $props();
</script>

<div class="k-empty">
	<span class="numeral k-mono">{numeral}</span>
	<h3 class="title">{title}</h3>
	{#if body}<p class="body">{body}</p>{/if}
	{#if action}
		<div class="action">{@render action()}</div>
	{/if}
</div>

<style>
	.k-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 16px;
		padding: 80px 24px;
		text-align: center;
		border: 1px dashed var(--k-line);
		background: var(--k-surface);
	}

	.numeral {
		font-size: clamp(72px, 12vw, 140px);
		font-weight: 600;
		line-height: 0.9;
		color: var(--k-line);
		letter-spacing: -0.04em;
	}

	.title {
		font-family: var(--font-display);
		font-weight: var(--type-wght-bold);
		font-size: 22px;
		margin: 0;
		color: var(--k-text);
		letter-spacing: -0.01em;
	}

	.body {
		max-width: 420px;
		font-size: 15px;
		color: var(--k-text-mute);
		margin: 0;
		line-height: 1.55;
	}

	.action {
		margin-top: 12px;
	}
</style>
