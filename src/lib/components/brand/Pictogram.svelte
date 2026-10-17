<!-- Brand pictogram. Size via CSS (default 24 px); colour via `color`, the ball stays red. -->
<script lang="ts">
	import { PICTOGRAMS, type PictogramName } from '$lib/brand/pictograms.js';

	interface Props {
		name: PictogramName;
		size?: number;
		label?: string;
		class?: string;
	}

	let { name, size = 24, label, class: className = '' }: Props = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 24 24"
	width={size}
	height={size}
	class="pictogram {className}"
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- static trusted brand asset -->
	{@html PICTOGRAMS[name]}
</svg>

<style>
	.pictogram {
		display: block;
		flex: none;
	}
</style>
