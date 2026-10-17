<script lang="ts">
	import KSegmented from './KSegmented.svelte';
	import { getStoredMotion, setStoredMotion } from '$lib/theme.js';
	import type { MotionMode } from '$lib/theme.js';

	let mode = $state<MotionMode>('system');

	$effect(() => {
		mode = getStoredMotion();
	});

	function onChange(next: MotionMode) {
		mode = next;
		setStoredMotion(next);
	}

	const options: { value: MotionMode; label: string; title: string }[] = [
		{ value: 'full', label: '●●●', title: 'Full motion' },
		{ value: 'damped', label: '●●○', title: 'Damped motion' },
		{ value: 'static', label: '○○○', title: 'No motion' },
		{ value: 'system', label: 'A', title: 'System / Auto' }
	];
</script>

<KSegmented {options} value={mode} {onChange} ariaLabel="Motion" />
