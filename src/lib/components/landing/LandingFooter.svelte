<script lang="ts">
	import type { Lang } from '$lib/i18n/landing.js';

	interface Props {
		lang: Lang;
	}

	let { lang }: Props = $props();

	const translations = {
		de: {
			copyright: '© 2026 Scorely',
			links: [
				{ label: 'Datenschutz', href: '/privacy' },
				{ label: 'Impressum', href: '/imprint' }
			]
		},
		en: {
			copyright: '© 2026 Scorely',
			links: [
				{ label: 'Privacy', href: '/privacy' },
				{ label: 'Imprint', href: '/imprint' }
			]
		}
	} as const;

	const tr = $derived(translations[lang]);
</script>

<footer
	class="border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] py-12 px-4"
>
	<div class="mx-auto max-w-6xl flex flex-col items-center gap-6 text-center">
		<span class="text-xl font-bold text-[var(--color-text-primary)]" style="font-family: 'Montserrat', sans-serif;">
			Scorely
		</span>

		<p class="text-sm text-[var(--color-text-tertiary)]">{tr.copyright}</p>

		<div class="flex items-center gap-6">
			{#each tr.links as link}
				<a
					href={link.href}
					class="text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
				>
					{link.label}
				</a>
			{/each}
		</div>

	</div>
</footer>
