<script lang="ts">
	import OverlayRenderer from '$lib/components/OverlayRenderer.svelte';
	import type { MatchState, Team } from '$lib/types.js';

	interface Props {
		match: MatchState;
		homeTimeoutsUsed: number;
		guestTimeoutsUsed: number;
		timeoutTeam: Team | null;
		customCode: string | null;
		templateId: number | null;
		layoutId: string | null;
		options: Record<string, unknown> | null;
	}

	let { match, homeTimeoutsUsed, guestTimeoutsUsed, timeoutTeam, customCode, templateId, layoutId, options }: Props =
		$props();

	// Natural size of the rendered scoreboard (CSS px); scale it to the card width.
	const NATURAL_WIDTH = 820;
	const NATURAL_HEIGHT = 150;
	let wrapWidth = $state(0);
	let scale = $derived(wrapWidth > 0 ? Math.min(1, wrapWidth / NATURAL_WIDTH) : 0.35);
</script>

<div class="scoreboard-preview-wrap" bind:clientWidth={wrapWidth} style:height="{Math.ceil(NATURAL_HEIGHT * scale)}px">
	<div class="scoreboard-preview-scale" style:transform="scale({scale})">
		<OverlayRenderer
			{match}
			{homeTimeoutsUsed}
			{guestTimeoutsUsed}
			{timeoutTeam}
			{customCode}
			{templateId}
			{layoutId}
			options={(options ?? {}) as Record<string, string | number | boolean>}
		/>
	</div>
</div>

<style>
	.scoreboard-preview-wrap {
		width: 100%;
		display: flex;
		justify-content: center;
		overflow: hidden;
		pointer-events: none;
	}

	.scoreboard-preview-scale {
		flex: none;
		transform-origin: top center;
	}
</style>
