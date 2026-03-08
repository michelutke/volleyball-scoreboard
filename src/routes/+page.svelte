<script lang="ts">
	import type { PageData } from './$types.js';
	import type { Lang } from '$lib/i18n/landing.js';
	import LandingNav from '$lib/components/landing/LandingNav.svelte';
	import Hero from '$lib/components/landing/Hero.svelte';
	import Features from '$lib/components/landing/Features.svelte';
	import HowItWorks from '$lib/components/landing/HowItWorks.svelte';
	import Pricing from '$lib/components/landing/Pricing.svelte';
	import Faq from '$lib/components/landing/Faq.svelte';
	import Demo from '$lib/components/landing/Demo.svelte';
	import LandingFooter from '$lib/components/landing/LandingFooter.svelte';

	let { data }: { data: PageData } = $props();

	// Initialize from localStorage, fallback to 'de'
	let lang = $state<Lang>('de');
	// NOTE: cannot read localStorage during SSR — use onMount pattern or just 'de' default
	// For SSR-safe init, just default to 'de'; client can toggle
</script>

<div class="landing">
	<LandingNav {lang} onLangToggle={() => { lang = lang === 'de' ? 'en' : 'de'; }} />
	<main>
		<Hero {lang} />
		<Demo {lang} />
		<Features {lang} />
		<HowItWorks {lang} />
		<Pricing {lang} price={data.price} />
		<Faq {lang} />
	</main>
	<LandingFooter {lang} />
</div>

<style>
	.landing {
		min-height: 100vh;
		background: radial-gradient(ellipse at 20% 0%, #3d0000 0%, #0a0a0a 55%);
		color: var(--color-text-primary);
	}
</style>
