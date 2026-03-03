<script lang="ts">
	import LandingNav from '$lib/components/landing/LandingNav.svelte';
	import LandingFooter from '$lib/components/landing/LandingFooter.svelte';
	import type { Lang } from '$lib/i18n/landing.js';

	let lang = $state<Lang>('de');
</script>

<LandingNav {lang} onLangToggle={() => { lang = lang === 'de' ? 'en' : 'de'; }} />

<main class="mx-auto max-w-3xl px-4 py-24 md:px-8">
	<h1 class="mb-8 text-3xl font-bold text-[var(--color-text-primary)]">Impressum</h1>
	<p class="text-[var(--color-text-secondary)]">Impressumsinformationen folgen.</p>
</main>

<LandingFooter {lang} />
