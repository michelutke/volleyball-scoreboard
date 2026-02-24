<script lang="ts">
	import '../app.css';
	import { generateAccentPalette, ACCENT_CSS_PROPS } from '$lib/theme.js';
	import type { LayoutData } from './$types.js';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	$effect(() => {
		const style = document.documentElement.style;
		const palette = data.accentColor ? generateAccentPalette(data.accentColor) : null;
		if (palette) {
			for (const [prop, key] of ACCENT_CSS_PROPS) style.setProperty(prop, palette[key]);
		} else {
			for (const [prop] of ACCENT_CSS_PROPS) style.removeProperty(prop);
		}
	});
</script>
{@render children()}
