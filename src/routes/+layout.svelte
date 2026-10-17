<script lang="ts">
	import '../app.css';
	import {
		getStoredTheme,
		getEffectiveTheme,
		getStoredMotion,
		getEffectiveMotion
	} from '$lib/theme.js';
	import type { ThemeMode, MotionMode } from '$lib/theme.js';
	import type { LayoutData } from './$types.js';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	let themeMode = $state<ThemeMode>('system');
	let effectiveTheme = $state<'light' | 'dark'>('dark');
	let motionMode = $state<MotionMode>('system');
	let effectiveMotion = $state<'full' | 'damped' | 'static'>('full');

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

	$effect(() => {
		document.documentElement.dataset.theme = effectiveTheme;
	});

	$effect(() => {
		motionMode = getStoredMotion();
		function onMotionChange(e: Event) {
			motionMode = (e as CustomEvent<MotionMode>).detail;
		}
		window.addEventListener('motionchange', onMotionChange);
		return () => window.removeEventListener('motionchange', onMotionChange);
	});

	$effect(() => {
		effectiveMotion = getEffectiveMotion(motionMode);
		if (motionMode === 'system') {
			const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
			const handler = () => {
				effectiveMotion = mq.matches ? 'damped' : 'full';
			};
			mq.addEventListener('change', handler);
			return () => mq.removeEventListener('change', handler);
		}
	});

	$effect(() => {
		if (motionMode === 'system') {
			document.documentElement.removeAttribute('data-motion');
		} else {
			document.documentElement.dataset.motion = effectiveMotion;
		}
	});
</script>

{@render children()}
