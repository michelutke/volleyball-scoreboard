<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		kicker?: string;
		title: string;
		subtitle?: string;
		actions?: Snippet;
		children: Snippet;
	}

	let { kicker, title, subtitle, actions, children }: Props = $props();
</script>

<section class="k-section">
	<header class="k-section-head">
		<div class="k-section-head-text">
			{#if kicker}<p class="kicker k-mono">{kicker}</p>{/if}
			<h1 class="title">{title}</h1>
			{#if subtitle}<p class="subtitle">{subtitle}</p>{/if}
		</div>
		{#if actions}
			<div class="k-section-actions">{@render actions()}</div>
		{/if}
	</header>
	<div class="k-section-body">
		{@render children()}
	</div>
</section>

<style>
	.k-section {
		max-width: var(--container-max);
		margin: 0 auto;
		padding: 48px var(--grid-margin);
	}

	.k-section-head {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 24px;
		flex-wrap: wrap;
		margin-bottom: 36px;
		padding-bottom: 24px;
		border-bottom: 1px solid var(--k-line);
	}

	.k-section-head-text {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.kicker {
		font-size: 11px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--k-text-dim);
		margin: 0;
	}

	.title {
		font-family: var(--font-display);
		font-weight: var(--type-wght-display);
		font-size: clamp(28px, 4vw, 44px);
		line-height: 1;
		letter-spacing: -0.025em;
		margin: 0;
		color: var(--k-text);
	}

	.subtitle {
		font-size: 15px;
		color: var(--k-text-mute);
		margin: 0;
		max-width: 60ch;
	}

	.k-section-actions {
		display: flex;
		gap: 10px;
		align-items: center;
		flex-wrap: wrap;
	}

	.k-section-body {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
</style>
