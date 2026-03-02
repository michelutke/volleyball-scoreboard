<script lang="ts">
	import { t } from '$lib/i18n/landing.js';
	import type { Lang } from '$lib/i18n/landing.js';

	interface Props {
		lang: Lang;
	}

	let { lang }: Props = $props();
</script>

<section id="features" class="bg-[var(--color-bg-base)] px-4 py-20 md:px-8">
	<div class="mx-auto max-w-6xl">
		<h2 class="mb-12 text-center text-3xl font-bold text-[var(--color-text-primary)]">
			{t[lang].features.title}
		</h2>

		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
			{#each t[lang].features.items as item}
				<div
					class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-panel-alt)] p-6 transition-colors hover:border-[var(--color-accent-mid)]"
				>
					<div class="mb-4 text-4xl">{item.icon}</div>
					<h3 class="mb-2 font-semibold text-[var(--color-text-primary)]">{item.title}</h3>
					<p class="text-sm leading-relaxed text-[var(--color-text-secondary)]">{item.desc}</p>
				</div>
			{/each}
		</div>

		<p class="mt-8 text-center text-xs italic text-[var(--color-text-tertiary)]">
			{t[lang].features.svDisclaimer}
		</p>
	</div>
</section>
