<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLInputAttributes, 'value'> {
		value?: string | number;
	}

	let { value = $bindable(''), class: className = '', ...rest }: Props = $props();
</script>

<input class="k-input {className}" bind:value {...rest} />

<style>
	.k-input {
		font-family: var(--font-sans);
		font-size: 15px;
		color: var(--k-text);
		background: var(--k-surface);
		border: 1px solid var(--k-line);
		border-radius: 0;
		padding: 12px 14px;
		width: 100%;
		transition:
			border-color var(--dur-fast) var(--ease-snap),
			background var(--dur-fast) var(--ease-snap);
	}
	.k-input::placeholder {
		color: var(--k-text-dim);
	}
	.k-input:hover {
		border-color: var(--k-text-mute);
	}
	.k-input:focus {
		outline: none;
		border-color: var(--pulse);
		background: color-mix(in srgb, var(--pulse) 4%, var(--k-surface));
	}
	.k-input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
