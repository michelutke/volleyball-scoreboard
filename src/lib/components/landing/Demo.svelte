<script lang="ts">
	import { addPoint, removePoint } from '$lib/volleyball.js';
	import type { MatchState, Team } from '$lib/types.js';
	import ScoreboardDisplay from '$lib/components/ScoreboardDisplay.svelte';
	import type { Lang } from '$lib/i18n/landing.js';
	import { t } from '$lib/i18n/landing.js';

	interface Props {
		lang: Lang;
	}

	let { lang }: Props = $props();

	const INITIAL: MatchState = {
		matchId: 0,
		homeTeamName: 'VBC Thun',
		guestTeamName: 'VBC Scorely',
		homeTeamLogo: null,
		guestTeamLogo: null,
		homePoints: 23,
		guestPoints: 22,
		homeSets: 1,
		guestSets: 1,
		currentSet: 3,
		setScores: [
			{ home: 25, guest: 23 },
			{ home: 22, guest: 25 }
		],
		serviceTeam: 'home',
		showSetScores: true,
		showJerseyColors: true,
		status: 'live',
		homeJerseyColor: '#cc0000',
		guestJerseyColor: '#1e6ab5',
		overlayBg: '#0f172a',
		overlayBg2: '#1e293b',
		overlayBgGradient: true,
		overlayText: '#ffffff',
		overlayRounded: true,
		overlayDivider: '#334155',
		overlaySatsBg: '#1e293b',
		overlaySetScoreBg: '#1e293b',
		scoreColor: '#0ea5e9',
		scoreColor2: '#0284c7',
		scoreColorGradient: true,
		designTemplateId: null
	};

	let match = $state<MatchState>({ ...INITIAL });
	let homeTimeouts = $state(0);
	let guestTimeouts = $state(0);
	let timeoutTeam = $state<Team | null>(null);
	let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		return () => {
			if (timeoutTimer) clearTimeout(timeoutTimer);
		};
	});

	function doAddPoint(team: Team) {
		if (match.status === 'finished') return;
		const prevSet = match.currentSet;
		match = addPoint($state.snapshot(match), team);
		if (match.currentSet !== prevSet) {
			homeTimeouts = 0;
			guestTimeouts = 0;
			timeoutTeam = null;
			if (timeoutTimer) clearTimeout(timeoutTimer);
		}
	}

	function doRemovePoint(team: Team) {
		if (match.status === 'finished') return;
		match = removePoint($state.snapshot(match), team);
	}

	function doTimeout(team: Team) {
		const used = team === 'home' ? homeTimeouts : guestTimeouts;
		if (used >= 2) return;
		if (team === 'home') homeTimeouts++;
		else guestTimeouts++;
		timeoutTeam = team;
		if (timeoutTimer) clearTimeout(timeoutTimer);
		timeoutTimer = setTimeout(() => {
			timeoutTeam = null;
			timeoutTimer = null;
		}, 30000);
	}

	function doReset() {
		match = { ...INITIAL };
		homeTimeouts = 0;
		guestTimeouts = 0;
		timeoutTeam = null;
		if (timeoutTimer) clearTimeout(timeoutTimer);
	}

	const tr = $derived(t[lang].demo);
	const matchWon = $derived(match.status === 'finished');
</script>

<section id="demo" class="px-4 py-20 md:px-8" style="background: var(--color-bg-elevated);">
	<div class="mx-auto max-w-5xl">
		<!-- Header -->
		<div class="mb-10 text-center">
			<h2
				class="mb-3 text-3xl font-bold"
				style="color: var(--color-text-primary); font-family: 'Montserrat', sans-serif;"
			>
				{tr.title}
			</h2>
			<p class="text-base" style="color: var(--color-text-secondary);">{tr.subtitle}</p>
		</div>

		<!-- OBS Preview Frame -->
		<div class="mb-8 overflow-hidden rounded-2xl border" style="border-color: var(--color-border-subtle); background: #050d1a;">
			<div class="flex items-center gap-2 border-b px-4 py-2 text-xs"
				style="border-color: var(--color-border-subtle); color: var(--color-text-tertiary);">
				<span class="h-3 w-3 rounded-full bg-red-500/60"></span>
				<span class="h-3 w-3 rounded-full bg-yellow-500/60"></span>
				<span class="h-3 w-3 rounded-full bg-green-500/60"></span>
				<span class="ml-2">{tr.obsLabel}</span>
			</div>
			<div class="flex items-center justify-center overflow-x-auto p-8 py-12">
				<div class="shrink-0">
					<ScoreboardDisplay
						{match}
						homeTimeoutsUsed={homeTimeouts}
						guestTimeoutsUsed={guestTimeouts}
						{timeoutTeam}
					/>
				</div>
			</div>
		</div>

		<!-- Control Panel -->
		{#if matchWon}
			<div class="mb-6 rounded-xl border px-6 py-5 text-center"
				style="border-color: var(--color-accent-border); background: var(--color-bg-panel-alt);">
				<p class="text-xl font-bold" style="color: var(--color-text-primary);">
					🏆 {match.homeSets > match.guestSets ? 'VBC Thun' : 'VBC Scorely'} — {tr.matchWon}
				</p>
				<p class="mt-1 text-sm" style="color: var(--color-text-secondary);">
					{match.homeSets}:{match.guestSets}
				</p>
				<button
					onclick={doReset}
					class="mt-4 rounded-lg px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-80"
					style="background: var(--color-accent-mid); color: white;"
				>
					{tr.reset}
				</button>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<!-- Home Team Control -->
				<div class="rounded-xl border p-5"
					style="border-color: var(--color-border-subtle); background: var(--color-bg-panel-alt);">
					<div class="mb-4 flex items-center gap-3">
						<div class="h-5 w-5 rounded-full shadow-sm" style="background: {match.homeJerseyColor};"></div>
						<span class="font-semibold" style="color: var(--color-text-primary);">VBC Thun</span>
						<span class="ml-auto text-xs px-2 py-0.5 rounded"
							style="background: var(--color-bg-elevated); color: var(--color-text-secondary);">
							{tr.set} {match.currentSet}
						</span>
					</div>
					<div class="mb-4 flex items-center justify-between gap-3">
						<button
							onclick={() => doRemovePoint('home')}
							disabled={match.homePoints === 0}
							class="h-12 w-12 rounded-lg text-2xl font-bold transition-all hover:opacity-80 disabled:opacity-30"
							style="background: var(--color-bg-elevated); color: var(--color-text-primary);"
						>−</button>
						<span class="text-5xl font-extrabold tabular-nums" style="color: var(--color-text-primary);"
							>{match.homePoints}</span
						>
						<button
							onclick={() => doAddPoint('home')}
							class="h-12 w-12 rounded-lg text-2xl font-bold transition-all hover:opacity-90"
							style="background: var(--color-accent-mid); color: white;"
						>+</button>
					</div>
					<button
						onclick={() => doTimeout('home')}
						disabled={homeTimeouts >= 2}
						class="w-full rounded-lg py-2 text-sm font-medium transition-all hover:opacity-80 disabled:opacity-30"
						style="background: {timeoutTeam === 'home' ? 'rgba(234,179,8,0.2)' : 'var(--color-bg-elevated)'}; color: var(--color-text-secondary); border: 1px solid var(--color-border-subtle);"
					>
						⏱ {tr.timeout} ({homeTimeouts}/2)
					</button>
				</div>

				<!-- Guest Team Control -->
				<div class="rounded-xl border p-5"
					style="border-color: var(--color-border-subtle); background: var(--color-bg-panel-alt);">
					<div class="mb-4 flex items-center gap-3">
						<div class="h-5 w-5 rounded-full shadow-sm" style="background: {match.guestJerseyColor};"></div>
						<span class="font-semibold" style="color: var(--color-text-primary);">VBC Scorely</span>
						<span class="ml-auto text-xs px-2 py-0.5 rounded"
							style="background: var(--color-bg-elevated); color: var(--color-text-secondary);">
							{tr.sets}: {match.homeSets}:{match.guestSets}
						</span>
					</div>
					<div class="mb-4 flex items-center justify-between gap-3">
						<button
							onclick={() => doRemovePoint('guest')}
							disabled={match.guestPoints === 0}
							class="h-12 w-12 rounded-lg text-2xl font-bold transition-all hover:opacity-80 disabled:opacity-30"
							style="background: var(--color-bg-elevated); color: var(--color-text-primary);"
						>−</button>
						<span class="text-5xl font-extrabold tabular-nums" style="color: var(--color-text-primary);"
							>{match.guestPoints}</span
						>
						<button
							onclick={() => doAddPoint('guest')}
							class="h-12 w-12 rounded-lg text-2xl font-bold transition-all hover:opacity-90"
							style="background: var(--color-accent-mid); color: white;"
						>+</button>
					</div>
					<button
						onclick={() => doTimeout('guest')}
						disabled={guestTimeouts >= 2}
						class="w-full rounded-lg py-2 text-sm font-medium transition-all hover:opacity-80 disabled:opacity-30"
						style="background: {timeoutTeam === 'guest' ? 'rgba(234,179,8,0.2)' : 'var(--color-bg-elevated)'}; color: var(--color-text-secondary); border: 1px solid var(--color-border-subtle);"
					>
						⏱ {tr.timeout} ({guestTimeouts}/2)
					</button>
				</div>
			</div>

			<div class="mt-4 text-center">
				<button
					onclick={doReset}
					class="text-sm transition-colors hover:opacity-80"
					style="color: var(--color-text-tertiary);"
				>
					{tr.reset}
				</button>
			</div>
		{/if}

	</div>
</section>
