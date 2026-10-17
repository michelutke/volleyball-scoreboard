<!--
	Nav logo (brand README 9.3 "Website nav on scroll"): scrollY 0 to 120 px scrubs the word
	to logo timeline from 0 to 1680 ms, no tween. The squash fires once, time based, when the
	scroll reaches 120 px. Reduced motion (damped or static) swaps lockup and mark at 50 %.
	Below 768 px the nav carries the mark only.
-->
<script lang="ts">
	import { scroll } from 'motion';
	import { BLOCK } from '$lib/brand/paths.js';
	import {
		heroForward,
		squash,
		LETTERS,
		LETTER_PATHS,
		NAV_END_MS,
		CONTACT_UP,
		CONTACT_LO,
		WORD_X0,
		WORD_XLINE,
		WORD_SCALE
	} from '$lib/brand/reveal.js';
	import Logo from './Logo.svelte';

	const SCROLL_RANGE = 120;
	const SQUASH_MS = 240;

	let progress = $state(0);
	let squashT = $state<number | null>(null);

	let reduced = $state(false);
	const frame = $derived(heroForward((reduced ? (progress >= 0.5 ? 1 : 0) : progress) * NAV_END_MS));
	const scale = $derived(squashT === null ? ([1, 1] as const) : squash(squashT, 0));

	function motionScale(): number {
		if (typeof document === 'undefined') return 1;
		const n = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--motion-scale'));
		return Number.isFinite(n) ? n : 1;
	}

	let squashFrame = 0;

	function runSquash() {
		if (motionScale() === 0) return;
		const start = performance.now();
		const tick = (now: number) => {
			const t = now - start;
			squashT = t < SQUASH_MS ? t : null;
			if (squashT !== null) squashFrame = requestAnimationFrame(tick);
		};
		squashFrame = requestAnimationFrame(tick);
	}

	$effect(() => {
		let landed = false;
		const stopScroll = scroll((_: number, info: { y: { current: number } }) => {
			const p = Math.min(1, Math.max(0, info.y.current / SCROLL_RANGE));
			reduced = motionScale() < 1;
			progress = p;
			if (p >= 1 && !landed) {
				landed = true;
				if (!reduced) runSquash();
			} else if (p < 1) {
				landed = false;
			}
		});
		return () => {
			stopScroll();
			cancelAnimationFrame(squashFrame);
		};
	});

	function squashAt([px, py]: readonly [number, number]): string {
		const [sx, sy] = scale;
		if (sx === 1 && sy === 1) return '';
		return `translate(${px} ${py}) scale(${sx} ${sy}) translate(${-px} ${-py})`;
	}
</script>

<span class="nav-logo">
	<svg class="desktop" viewBox="24 10 762.39 240" role="img" aria-label="Scorely">
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
		<circle cx={frame.up.x} cy={frame.up.y} r={frame.up.r} fill="var(--pulse)" transform={squashAt(CONTACT_UP)} />
		<circle cx={frame.lo.x} cy={frame.lo.y} r={frame.lo.r} fill="var(--pulse)" transform={squashAt(CONTACT_LO)} />
	</svg>
	<Logo variant="mark" class="mobile" />
</span>

<style>
	.nav-logo {
		display: inline-flex;
		align-items: center;
		color: var(--k-text);
	}
	.desktop {
		display: none;
		height: 30px;
		width: auto;
		overflow: visible;
	}
	.nav-logo :global(.mobile) {
		height: 24px;
	}
	@media (min-width: 768px) {
		.desktop {
			display: block;
		}
		.nav-logo :global(.mobile) {
			display: none;
		}
	}
</style>
