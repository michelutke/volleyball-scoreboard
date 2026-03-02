<script lang="ts">
	import { t } from '$lib/i18n/landing.js';
	import type { Lang } from '$lib/i18n/landing.js';

	interface Props {
		lang: Lang;
	}

	let { lang }: Props = $props();
</script>

<section id="how-it-works" class="bg-[var(--color-bg-base)] px-4 py-20 md:px-8">
	<div class="mx-auto max-w-4xl">
		<h2 class="mb-12 text-center text-3xl font-bold text-[var(--color-text-primary)]">
			{t[lang].howItWorks.title}
		</h2>

		<div class="flex flex-col items-start gap-8 md:flex-row md:items-start">
			{#each t[lang].howItWorks.steps as step, i}
				<div class="flex flex-1 flex-col items-center text-center">
					<div
						class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent-mid)] text-xl font-bold text-white shadow-md"
					>
						{step.num}
					</div>
					<h3 class="mb-2 font-semibold text-[var(--color-text-primary)]">{step.title}</h3>
					<p class="text-sm leading-relaxed text-[var(--color-text-secondary)]">{step.desc}</p>
				</div>

				{#if i < t[lang].howItWorks.steps.length - 1}
					<!-- Arrow connector: visible on md+, hidden on mobile -->
					<div class="hidden items-center self-start pt-6 text-2xl text-[var(--color-text-tertiary)] md:flex">
						→
					</div>
				{/if}
			{/each}
		</div>
	</div>
</section>
