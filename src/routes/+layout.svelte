<script lang="ts">
	import '../app.css';
	import { generateAccentPalette, ACCENT_CSS_PROPS, getStoredTheme, getEffectiveTheme } from '$lib/theme.js';
	import type { ThemeMode } from '$lib/theme.js';
	import type { LayoutData } from './$types.js';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	let themeMode = $state<ThemeMode>('system');
	let effectiveTheme = $state<'light' | 'dark'>('dark');

	$effect(() => {
		themeMode = getStoredTheme();
		function onThemeChange(e: Event) {
			themeMode = (e as CustomEvent<ThemeMode>).detail;
		}
		window.addEventListener('themechange', onThemeChange);
		return () => window.removeEventListener('themechange', onThemeChange);
	});

	$effect(() => {
		effectiveTheme = getEffectiveTheme(themeMode);
		if (themeMode === 'system') {
			const mq = window.matchMedia('(prefers-color-scheme: light)');
			const handler = () => {
				effectiveTheme = mq.matches ? 'light' : 'dark';
			};
			mq.addEventListener('change', handler);
			return () => mq.removeEventListener('change', handler);
		}
	});

	const palette = $derived(data.accentColor ? generateAccentPalette(data.accentColor, effectiveTheme) : null);

	$effect(() => {
		document.documentElement.dataset.theme = effectiveTheme;
	});

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

{@render children()}
