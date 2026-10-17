<!--
	The only way to render the Scorely logo. Ink parts use currentColor (set `color` to
	ink or paper); the balls and the o are always pulse red. Height is set by CSS
	(`height` on the svg via `class`/`style`), width follows the viewBox.
-->
<script lang="ts">
	import { BLOCK, BLOCK_HEAVY, BALLS, BALLS_HEAVY, CORELY, CORELY_O, WORDMARK, WORDMARK_O, LIVE_TEXT, VIEWBOX } from '$lib/brand/paths.js';

	type Variant = 'lockup' | 'mark' | 'wordmark' | 'stacked' | 'live';

	interface Props {
		variant?: Variant;
		/** Heavy cut of the mark for 12 to 23 px. */
		heavy?: boolean;
		label?: string;
		class?: string;
		style?: string;
	}

	let { variant = 'lockup', heavy = false, label = 'Scorely', class: className = '', style = '' }: Props = $props();

	const RED = 'var(--pulse, #ff3d2e)';
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox={VIEWBOX[variant]}
	class="logo logo-{variant} {className}"
	{style}
	role="img"
	aria-label={variant === 'live' ? `${label} Live` : label}
>
	{#if variant === 'mark'}
		<path d={heavy ? BLOCK_HEAVY : BLOCK} fill="currentColor" />
		{#each heavy ? BALLS_HEAVY : BALLS as b (b.cx)}
			<circle cx={b.cx} cy={b.cy} r={b.r} fill={RED} />
		{/each}
	{:else if variant === 'wordmark'}
		<path d={WORDMARK} fill="currentColor" fill-rule="evenodd" />
		<circle cx={WORDMARK_O.cx} cy={WORDMARK_O.cy} r={WORDMARK_O.r} fill={RED} />
	{:else if variant === 'stacked'}
		<path d={BLOCK} fill="currentColor" />
		{#each BALLS as b (b.cx)}
			<circle cx={b.cx} cy={b.cy} r={b.r} fill={RED} />
		{/each}
		<g transform="translate(-44.02,239.2) scale(0.49)">
			<path d={WORDMARK} fill="currentColor" fill-rule="evenodd" />
			<circle cx={WORDMARK_O.cx} cy={WORDMARK_O.cy} r={WORDMARK_O.r} fill={RED} />
		</g>
	{:else}
		<path d={BLOCK} fill="currentColor" />
		<g transform="translate(196,70) scale(1.2)">
			<path d={CORELY} fill="currentColor" fill-rule="evenodd" />
			<circle cx={CORELY_O.cx} cy={CORELY_O.cy} r={CORELY_O.r} fill={RED} />
		</g>
		{#if variant === 'live'}
			<g transform="translate(846.39,70) scale(1.2)">
				<rect x="0" y="0" width="285.5" height="100" rx="50" ry="50" fill="currentColor" />
				<circle cx="50" cy="50" r="25" fill={RED} />
				<path d={LIVE_TEXT} class="live-text" />
			</g>
		{/if}
	{/if}
</svg>

<style>
	.logo {
		display: block;
		height: 1em;
		width: auto;
		overflow: visible;
	}
	.live-text {
		fill: var(--k-surface, #f5f3ee);
	}
</style>
