<script lang="ts">
	import type { MatchState, Team } from '$lib/types.js';
	import { page } from '$app/state';
	import { clubAccentStyle } from '$lib/theme.js';
	import { getLayout, type ScoreboardOptions } from './scoreboards/index.js';

	interface Props {
		match: MatchState;
		homeTimeoutsUsed: number;
		guestTimeoutsUsed: number;
		timeoutTeam: Team | null;
		layoutId?: string | null;
		options?: ScoreboardOptions;
	}

	let { match, homeTimeoutsUsed, guestTimeoutsUsed, timeoutTeam, layoutId = null, options = {} }: Props = $props();

	const layout = $derived(getLayout(layoutId));
	const Layout = $derived(layout.component);
	const clubStyle = $derived(clubAccentStyle(page.data?.accentColor as string | null | undefined));
</script>

<div class="club-scope" style={clubStyle}>
	<Layout {match} {homeTimeoutsUsed} {guestTimeoutsUsed} {timeoutTeam} {options} />
</div>

<style>
	.club-scope {
		display: contents;
	}
</style>
