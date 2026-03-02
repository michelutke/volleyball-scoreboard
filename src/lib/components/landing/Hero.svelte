<script lang="ts">
	import { t } from '$lib/i18n/landing.js';
	import type { Lang } from '$lib/i18n/landing.js';

	interface Props {
		lang: Lang;
	}

	let { lang }: Props = $props();

	const headlineLines = $derived(t[lang].hero.headline.split('\n'));

	function scrollToDemo(e: MouseEvent) {
		e.preventDefault();
		document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
	}
</script>

<section
	id="hero"
	class="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg-base)] px-4 pt-20 pb-16 text-center"
>
	<div class="mx-auto max-w-4xl">
		<h1 class="mb-6 font-extrabold tracking-tight text-white" style="font-family: 'Montserrat', sans-serif;">
			{#each headlineLines as line}
				<span class="block text-5xl md:text-7xl leading-tight">
					{line}
				</span>
			{/each}
		</h1>

		<p class="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-[var(--color-text-secondary)]">
			{t[lang].hero.sub}
		</p>

		<div class="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
			<a
				href="/signup"
				class="rounded-xl bg-[var(--color-accent-mid)] px-8 py-4 text-base font-semibold text-white shadow-lg transition-opacity hover:opacity-90"
			>
				{t[lang].hero.ctaPrimary}
			</a>
			<a
				href="#demo"
				onclick={scrollToDemo}
				class="rounded-xl border border-[var(--color-border-subtle)] px-8 py-4 text-base font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent-mid)] hover:text-[var(--color-accent-mid)]"
			>
				{t[lang].hero.ctaSecondary}
			</a>
		</div>

		<p class="mt-8 text-sm text-[var(--color-text-tertiary)]">
			{t[lang].hero.socialProof}
		</p>
	</div>
</section>
