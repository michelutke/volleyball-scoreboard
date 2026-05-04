<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		hint?: string;
		error?: string;
		required?: boolean;
		for?: string;
		children: Snippet;
	}

	let { label, hint, error, required = false, for: forId, children }: Props = $props();
</script>

<label class="k-field" class:has-error={!!error} for={forId}>
	<span class="k-field-label k-mono">
		{label}
		{#if required}<span class="req" aria-hidden="true">*</span>{/if}
	</span>
	{@render children()}
	{#if error}
		<span class="k-field-error">{error}</span>
	{:else if hint}
		<span class="k-field-hint">{hint}</span>
	{/if}
</label>

<style>
	.k-field {
		display: flex;
		flex-direction: column;
		gap: 6px;
		width: 100%;
	}

	.k-field-label {
		font-size: 11px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--k-text-dim);
		display: flex;
		gap: 4px;
		align-items: baseline;
	}
	.req {
		color: var(--pulse);
		font-family: var(--font-mono);
	}

	.k-field-hint {
		font-size: 12px;
		color: var(--k-text-dim);
	}

	.k-field-error {
		font-size: 12px;
		color: var(--color-error);
	}

	.has-error :global(.k-input),
	.has-error :global(textarea),
	.has-error :global(select) {
		border-color: var(--color-error);
	}
</style>
