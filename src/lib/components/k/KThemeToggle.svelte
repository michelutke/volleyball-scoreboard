<script lang="ts">
	import KSegmented from './KSegmented.svelte';
	import { getStoredTheme, setStoredTheme } from '$lib/theme.js';
	import type { ThemeMode } from '$lib/theme.js';

	let mode = $state<ThemeMode>('system');

	$effect(() => {
		mode = getStoredTheme();
	});

	function onChange(next: ThemeMode) {
		mode = next;
		setStoredTheme(next);
	}

	const options: { value: ThemeMode; label: string; title: string }[] = [
		{ value: 'light', label: 'L', title: 'Light' },
		{ value: 'dark', label: 'D', title: 'Dark' },
		{ value: 'system', label: 'A', title: 'System / Auto' }
	];
</script>

<KSegmented {options} value={mode} {onChange} ariaLabel="Theme" />
