<script lang="ts" generics="T extends string">
	interface Option {
		value: T;
		label: string;
		title?: string;
	}

	interface Props {
		options: Option[];
		value: T;
		onChange: (next: T) => void;
		size?: 'sm' | 'md';
		ariaLabel?: string;
	}

	let { options, value, onChange, size = 'sm', ariaLabel }: Props = $props();
</script>

<div class="k-seg k-seg-{size}" role="radiogroup" aria-label={ariaLabel}>
	{#each options as opt}
		<button
			type="button"
			class="opt"
			class:active={value === opt.value}
			role="radio"
			aria-checked={value === opt.value}
			title={opt.title ?? opt.label}
			onclick={() => onChange(opt.value)}
		>
			{opt.label}
		</button>
	{/each}
</div>

<style>
	.k-seg {
		display: inline-flex;
		border: 1px solid var(--k-line);
		background: var(--k-surface);
		padding: 2px;
		gap: 0;
	}

	.opt {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		background: transparent;
		border: none;
		color: var(--k-text-mute);
		cursor: pointer;
		transition:
			color var(--dur-fast) var(--ease-snap),
			background var(--dur-fast) var(--ease-snap);
	}
	.k-seg-sm .opt {
		padding: 6px 10px;
	}
	.k-seg-md .opt {
		padding: 9px 14px;
		font-size: 12px;
	}

	.opt:hover:not(.active) {
		color: var(--k-text);
	}

	.opt.active {
		background: var(--k-text);
		color: var(--k-surface);
	}

	.opt:focus-visible {
		outline: 2px solid var(--pulse);
		outline-offset: 2px;
	}
</style>
