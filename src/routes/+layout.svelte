<script lang="ts">
	import '../app.css';
	import { generateAccentPalette, ACCENT_CSS_PROPS } from '$lib/theme.js';
	import type { LayoutData } from './$types.js';

	let { data, children }: { data: LayoutData; children: any } = $props();

	const palette = $derived(data.accentColor ? generateAccentPalette(data.accentColor) : null);

	const accentStyle = $derived(
		palette
			? `:root { ${ACCENT_CSS_PROPS.map(([prop, key]) => `${prop}: ${palette[key]}`).join('; ')}; }`
			: ''
	);

	$effect(() => {
		const style = document.documentElement.style;
		if (palette) {
			for (const [prop, key] of ACCENT_CSS_PROPS) {
				style.setProperty(prop, palette[key]);
			}
		} else {
			for (const [prop] of ACCENT_CSS_PROPS) {
				style.removeProperty(prop);
			}
		}
	});
</script>

<svelte:head>
	{#if accentStyle}
		{@html `<style>${accentStyle}</style>`}
	{/if}
</svelte:head>

{@render children()}
