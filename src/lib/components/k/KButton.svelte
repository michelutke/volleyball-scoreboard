<script lang="ts">
	import { magnetic } from '$lib/motion.js';
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
	type Size = 'sm' | 'md' | 'lg';

	interface BaseProps {
		variant?: Variant;
		size?: Size;
		magnetic?: boolean;
		full?: boolean;
		children: Snippet;
	}

	type Props =
		| (BaseProps & { href: string } & Omit<HTMLAnchorAttributes, 'children' | 'size'>)
		| (BaseProps & { href?: undefined } & Omit<HTMLButtonAttributes, 'children' | 'size'>);

	let {
		variant = 'primary',
		size = 'md',
		magnetic: useMagnetic = false,
		full = false,
		href,
		children,
		...rest
	}: Props = $props();

	const klass = $derived(`k-btn k-btn-${variant} k-btn-${size}${full ? ' k-btn-full' : ''}`);
</script>

{#if href}
	<a {href} class={klass} use:magnetic={useMagnetic ? { strength: 0.2, radius: 60 } : undefined} {...rest as HTMLAnchorAttributes}>
		{@render children()}
	</a>
{:else}
	<button class={klass} use:magnetic={useMagnetic ? { strength: 0.2, radius: 60 } : undefined} {...rest as HTMLButtonAttributes}>
		{@render children()}
	</button>
{/if}

<style>
	.k-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		font-family: var(--font-sans);
		font-weight: 600;
		text-decoration: none;
		border: 1px solid transparent;
		border-radius: 999px;
		cursor: pointer;
		will-change: transform;
		transition:
			background var(--dur-fast) var(--ease-snap),
			border-color var(--dur-fast) var(--ease-snap),
			color var(--dur-fast) var(--ease-snap);
		white-space: nowrap;
	}
	.k-btn:focus-visible {
		outline: 2px solid var(--pulse);
		outline-offset: 3px;
	}
	.k-btn:disabled,
	.k-btn[aria-disabled='true'] {
		opacity: 0.5;
		cursor: not-allowed;
		pointer-events: none;
	}

	.k-btn-sm {
		font-size: 13px;
		padding: 7px 14px;
	}
	.k-btn-md {
		font-size: 14px;
		padding: 11px 22px;
	}
	.k-btn-lg {
		font-size: 16px;
		padding: 16px 28px;
	}

	.k-btn-full {
		width: 100%;
	}

	.k-btn-primary {
		background: var(--pulse);
		color: var(--paper);
	}
	.k-btn-primary:hover {
		background: var(--pulse-deep);
	}

	.k-btn-secondary {
		background: transparent;
		color: var(--k-text);
		border-color: var(--k-line);
	}
	.k-btn-secondary:hover {
		border-color: var(--k-text-mute);
		background: color-mix(in srgb, var(--k-text) 4%, transparent);
	}

	.k-btn-ghost {
		background: transparent;
		color: var(--k-text-mute);
	}
	.k-btn-ghost:hover {
		color: var(--k-text);
		background: color-mix(in srgb, var(--k-text) 5%, transparent);
	}

	.k-btn-danger {
		background: transparent;
		color: var(--color-error);
		border-color: var(--color-error);
	}
	.k-btn-danger:hover {
		background: color-mix(in srgb, var(--color-error) 12%, transparent);
	}
</style>
