<!--
	Hero brand moment (brand README 9.3 "Colon to logo"): the colon balls slide apart, squash at
	contact, then the block ripples out of the two contact points. Time based, plays once on
	mount. Motion scale 0 shows the finished mark, damped (0.3) plays the same timeline faster
	without the squash.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { BLOCK } from '$lib/brand/paths.js';
	import { colonForward, squashAbout, COLON_END_MS, CONTACT_UP, CONTACT_LO } from '$lib/brand/reveal.js';

	const CLIP_ID = 'hero-mark-ripple';

	let time = $state(0);
	let withSquash = $state(true);

	const frame = $derived(colonForward(time));
	const squash = $derived(withSquash ? frame.squash : ([1, 1] as const));

	function motionScale(): number {
		const n = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--motion-scale'));
		return Number.isFinite(n) ? n : 1;
	}

	onMount(() => {
		const motion = motionScale();
		if (motion === 0) {
			time = COLON_END_MS;
			return;
		}
		withSquash = motion === 1;
		const start = performance.now();
		let raf = 0;
		const tick = (now: number) => {
			time = Math.min(COLON_END_MS + 240, (now - start) / motion);
			if (time < COLON_END_MS + 240) raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});
</script>

<svg class="hero-mark" viewBox="0 0 200 200" aria-hidden="true">
	<defs>
		<clipPath id={CLIP_ID}>
			<circle cx={CONTACT_UP[0]} cy={CONTACT_UP[1]} r={frame.ripple} />
			<circle cx={CONTACT_LO[0]} cy={CONTACT_LO[1]} r={frame.ripple} />
		</clipPath>
	</defs>
	<path d={BLOCK} fill="var(--k-text)" clip-path="url(#{CLIP_ID})" />
	<circle cx={frame.up.x} cy={frame.up.y} r={frame.up.r} fill="var(--pulse)" transform={squashAbout(CONTACT_UP, squash)} />
	<circle cx={frame.lo.x} cy={frame.lo.y} r={frame.lo.r} fill="var(--pulse)" transform={squashAbout(CONTACT_LO, squash)} />
</svg>

<style>
	.hero-mark {
		display: block;
		height: 140px;
		width: auto;
		aspect-ratio: 1;
		overflow: visible;
	}
	@media (min-width: 1024px) {
		.hero-mark {
			height: 320px;
		}
	}
</style>
