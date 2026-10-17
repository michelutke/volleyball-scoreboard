<!--
	Brand pattern band (README 7). `d` is the ball diameter in px: quiet 8, standard 16, loud 32.
	Type never sits on a pattern; place the band between sections. A band is one tile high
	unless `height` is given.
-->
<script lang="ts">
	type PatternName = 'wave' | 'score';

	interface Props {
		name?: PatternName;
		d?: number;
		fg?: string;
		bg?: string;
		height?: number;
		class?: string;
	}

	let {
		name = 'wave',
		d = 16,
		fg = 'var(--paper)',
		bg = 'var(--ink)',
		height,
		class: className = ''
	}: Props = $props();

	const uid = $props.id();

	/** Source tiles are drawn at d = 24 (wave: 192 x 192, score: 96 x 72). */
	const TILE = { wave: { w: 192, h: 192 }, score: { w: 96, h: 72 } } as const;
	const k = $derived(d / 24);
	const bandHeight = $derived(height ?? TILE[name].h * k);
</script>

<svg class="pattern-band {className}" width="100%" height={bandHeight} aria-hidden="true">
	<defs>
		<pattern
			id="sc-{name}-{uid}"
			width={TILE[name].w}
			height={TILE[name].h}
			patternUnits="userSpaceOnUse"
			patternTransform="scale({k})"
		>
			{#if name === 'wave'}
				<path d="M96 96L0 96A96 96 0 0 1 96 0Z" fill={fg} />
				<path d="M0 96L96 96A96 96 0 0 1 0 192Z" fill={fg} />
				<path d="M96 0L192 0A96 96 0 0 1 96 96Z" fill={fg} />
				<path d="M192 192L96 192A96 96 0 0 1 192 96Z" fill={fg} />
			{:else}
				<circle cx="73" cy="21" r="12.3" fill={fg} />
				<circle cx="23" cy="51" r="12.3" fill={fg} />
			{/if}
		</pattern>
	</defs>
	<rect width="100%" height="100%" fill={bg} />
	<rect width="100%" height="100%" fill="url(#sc-{name}-{uid})" />
</svg>

<style>
	.pattern-band {
		display: block;
	}
</style>
