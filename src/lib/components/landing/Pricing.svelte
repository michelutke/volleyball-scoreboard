<script lang="ts">
	import type { Lang } from '$lib/i18n/landing.js';

	interface Props {
		lang: Lang;
		price: { amount: number; currency: string } | null;
	}

	let { lang, price }: Props = $props();

	const translations = {
		de: {
			title: 'Alles was dein Verein braucht.',
			productName: 'Scorely',
			priceLabel: '/ Monat',
			fallbackPrice: 'Auf Anfrage',
			features: [
				'Unbegrenzte Matches',
				'Echtzeit-Overlay für Streams',
				'Bis zu 5 Scorer',
				'Swiss Volley Spielplan-Import*',
				'E-Mail Support'
			],
			cta: '3 Tage kostenlos testen',
			note: 'Keine Kreditkarte erforderlich · Jederzeit kündbar',
			svDisclaimer: '* Inoffizielle Integration. Nicht mit Swiss Volley verbunden.'
		},
		en: {
			title: 'Everything your club needs.',
			productName: 'Scorely',
			priceLabel: '/ month',
			fallbackPrice: 'Contact us',
			features: [
				'Unlimited matches',
				'Real-time overlay for streams',
				'Up to 5 scorers',
				'Swiss Volley schedule import*',
				'Email support'
			],
			cta: 'Try free for 3 days',
			note: 'No credit card required · Cancel anytime',
			svDisclaimer: '* Unofficial integration. Not affiliated with Swiss Volley.'
		}
	} as const;

	const tr = $derived(translations[lang]);
</script>

<section id="pricing" class="py-24 px-4">
	<div class="mx-auto max-w-6xl">
		<h2
			class="mb-12 text-center text-3xl font-bold text-[var(--color-text-primary)]"
			style="font-family: 'Montserrat', sans-serif;"
		>
			{tr.title}
		</h2>

		<div
			class="mx-auto max-w-sm rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-panel-alt)] p-8"
		>
			<p class="mb-2 text-xl font-bold text-[var(--color-text-primary)]">{tr.productName}</p>

			<div class="mb-6 flex items-baseline gap-2">
				{#if price}
					<span class="text-4xl font-extrabold text-[var(--color-text-primary)]">
						{price.currency} {price.amount}
					</span>
					<span class="text-[var(--color-text-secondary)]">{tr.priceLabel}</span>
				{:else}
					<span class="text-4xl font-extrabold text-[var(--color-text-primary)]">
						{tr.fallbackPrice}
					</span>
				{/if}
			</div>

			<ul class="mb-8 space-y-1">
				{#each tr.features as feature}
					<li class="flex items-center gap-3 py-1">
						<span class="font-semibold text-[var(--color-accent-mid)]">✓</span>
						<span class="text-[var(--color-text-secondary)]">{feature}</span>
					</li>
				{/each}
			</ul>

			<a
				href="/signup"
				class="block w-full rounded-xl bg-[var(--color-accent-mid)] py-3 text-center font-semibold text-white transition-opacity hover:opacity-90"
			>
				{tr.cta}
			</a>

			<p class="mt-3 text-center text-sm text-[var(--color-text-tertiary)]">{tr.note}</p>

			<p class="mt-4 text-center text-xs italic text-[var(--color-text-tertiary)]">
				{tr.svDisclaimer}
			</p>
		</div>
	</div>
</section>
