<script lang="ts">
	import type { PageData } from './$types.js';
	import type { Lang } from '$lib/i18n/landing.js';
	import LandingNav from '$lib/components/landing/LandingNav.svelte';
	import Hero from '$lib/components/landing/Hero.svelte';
	import Features from '$lib/components/landing/Features.svelte';
	import HowItWorks from '$lib/components/landing/HowItWorks.svelte';
	import Pricing from '$lib/components/landing/Pricing.svelte';
	import Faq from '$lib/components/landing/Faq.svelte';
	import Pattern from '$lib/components/brand/Pattern.svelte';
	import LandingFooter from '$lib/components/landing/LandingFooter.svelte';

	let { data }: { data: PageData } = $props();

	let lang = $state<Lang>('de');
</script>

<div class="landing">
	<LandingNav {lang} onLangToggle={() => { lang = lang === 'de' ? 'en' : 'de'; }} />
	<main>
		<Hero {lang} />
		<Pattern name="wave" d={12} fg="var(--k-text)" bg="var(--k-surface)" class="band-desktop" />
		<Pattern name="wave" d={6} fg="var(--k-text)" bg="var(--k-surface)" class="band-mobile" />
		<HowItWorks {lang} />
		<Features {lang} />
		<Pricing {lang} price={data.price} />
		<Faq {lang} />
	</main>
	<LandingFooter {lang} />
</div>

<style>
	/* Pattern density steps down with the type scale: quiet on phones (manual p24) */
	:global(.band-desktop) {
		display: none !important;
	}
	@media (min-width: 768px) {
		:global(.band-desktop) {
			display: block !important;
		}
		:global(.band-mobile) {
			display: none !important;
		}
	}

	.landing {
		min-height: 100vh;
		background: var(--k-surface);
		color: var(--k-text);
	}
	:global(body:has(.landing)) {
		background: var(--k-surface);
	}
</style>
