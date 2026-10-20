<!--
	Nav logo (brand README 9.3 "Website nav on scroll"): when the nav collapses (scrollY past
	24 px, passed in as `collapsed`) the word to logo timeline plays forward at real speed
	from the current time to NAV_END_MS (rAF), then the squash fires once at contact. When the
	nav expands again it plays in reverse back to 0, no squash. A direction flip continues from
	the current time. Motion scale 0 jumps to the end state; damped (0.3) plays the same
	timeline without the squash. The animated lockup shows at every width.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { BLOCK } from '$lib/brand/paths.js';
	import {
		heroForward,
		squash,
		squashAbout,
		LETTERS,
		LETTER_PATHS,
		NAV_END_MS,
		CONTACT_UP,
		CONTACT_LO,
		WORD_X0,
		WORD_XLINE,
		WORD_SCALE
	} from '$lib/brand/reveal.js';

	interface Props {
		collapsed?: boolean;
	}

	let { collapsed = false }: Props = $props();

	const SQUASH_MS = 240;

	let time = $state(0);
	let squashT = $state<number | null>(null);

	const frame = $derived(heroForward(time));
	const scale = $derived(squashT === null ? ([1, 1] as const) : squash(squashT, 0));

	function motionScale(): number {
		if (typeof document === 'undefined') return 1;
		const n = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--motion-scale'));
		return Number.isFinite(n) ? n : 1;
	}

	let timeFrame = 0;
	let squashFrame = 0;

	function runSquash() {
		const start = performance.now();
		const tick = (now: number) => {
			const t = now - start;
			squashT = t < SQUASH_MS ? t : null;
			if (squashT !== null) squashFrame = requestAnimationFrame(tick);
		};
		squashFrame = requestAnimationFrame(tick);
	}

	function stop() {
		cancelAnimationFrame(timeFrame);
		cancelAnimationFrame(squashFrame);
		squashT = null;
	}

	function play(direction: 1 | -1) {
		stop();
		const motion = motionScale();
		const target = direction === 1 ? NAV_END_MS : 0;
		if (motion === 0) {
			time = target;
			return;
		}
		let last = performance.now();
		const tick = (now: number) => {
			time = Math.min(NAV_END_MS, Math.max(0, time + direction * (now - last)));
			last = now;
			if (time === target) {
				if (direction === 1 && motion === 1) runSquash();
				return;
			}
			timeFrame = requestAnimationFrame(tick);
		};
		timeFrame = requestAnimationFrame(tick);
	}

	$effect(() => {
		const direction = collapsed ? 1 : -1;
		untrack(() => play(direction));
		return stop;
	});
</script>

<span class="nav-logo">
	<svg viewBox="24 10 762.39 240" role="img" aria-label="Scorely">
		<path d={BLOCK} fill="currentColor" />
		{#each LETTERS as ch (ch)}
			{@const l = frame.letters[ch]}
			{#if l.opacity > 0}
				<g transform="translate({l.dx} 0)" opacity={l.opacity}>
					<path
						d={LETTER_PATHS[ch]}
						transform="translate({WORD_X0} {WORD_XLINE}) scale({WORD_SCALE})"
						fill="currentColor"
						fill-rule="evenodd"
					/>
				</g>
			{/if}
		{/each}
		<circle cx={frame.up.x} cy={frame.up.y} r={frame.up.r} fill="var(--pulse)" transform={squashAbout(CONTACT_UP, scale)} />
		<circle cx={frame.lo.x} cy={frame.lo.y} r={frame.lo.r} fill="var(--pulse)" transform={squashAbout(CONTACT_LO, scale)} />
	</svg>
</span>

<style>
	.nav-logo {
		display: inline-flex;
		align-items: center;
		color: var(--k-text);
	}
	svg {
		display: block;
		height: 24px;
		width: auto;
		overflow: visible;
	}
	@media (min-width: 768px) {
		svg {
			height: 30px;
		}
	}
</style>
