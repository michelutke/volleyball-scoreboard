<script lang="ts">
	import type { Lang } from '$lib/i18n/landing.js';

	interface Props {
		lang: Lang;
		price: { amount: number; currency: string } | null;
	}

	let { lang, price }: Props = $props();

	const GITHUB_URL = 'https://github.com/michelutke/volleyball-scoreboard';

	const translations = {
		de: {
			title: 'Alles was dein Verein braucht.',
			saas: {
				name: 'Scorely SaaS',
				priceLabel: '/ Monat',
				fallbackPrice: 'Auf Anfrage',
				features: [
					'Unbegrenzte Matches',
					'Echtzeit-Overlay für Streams',
					'Bis zu 5 Scorer',
					'Swiss Volley Spielplan-Import',
					'E-Mail Support',
					'Hosting inklusive'
				],
				cta: '3 Tage kostenlos testen',
				note: 'Keine Kreditkarte erforderlich · Jederzeit kündbar',
				badge: 'Empfohlen'
			},
			selfHosted: {
				name: 'Self-Hosted',
				price: 'Kostenlos',
				features: [
					'Alle Features',
					'Open Source (MIT)',
					'Kein SaaS-Vertrag',
					'Volle Datenkontrolle',
					'Community Support'
				],
				cta: 'Auf GitHub ansehen',
				note: 'Contributions willkommen ✌️'
			}
		},
		en: {
			title: 'Everything your club needs.',
			saas: {
				name: 'Scorely SaaS',
				priceLabel: '/ month',
				fallbackPrice: 'Contact us',
				features: [
					'Unlimited matches',
					'Real-time overlay for streams',
					'Up to 5 scorers',
					'Swiss Volley schedule import',
					'Email support',
					'Hosting included'
				],
				cta: 'Try free for 3 days',
				note: 'No credit card required · Cancel anytime',
				badge: 'Recommended'
			},
			selfHosted: {
				name: 'Self-Hosted',
				price: 'Free',
				features: [
					'All features',
					'Open Source (MIT)',
					'No SaaS contract',
					'Full data control',
					'Community support'
				],
				cta: 'View on GitHub',
				note: 'Contributions welcome ✌️'
			}
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

		<div class="mx-auto flex max-w-3xl flex-col gap-6 sm:flex-row sm:items-stretch">
			<!-- SaaS Card -->
			<div class="relative flex flex-1 flex-col rounded-2xl border-2 border-[var(--color-accent-mid)] bg-[var(--color-bg-panel-alt)] p-8">
				<span class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-accent-mid)] px-3 py-0.5 text-xs font-semibold text-white">
					{tr.saas.badge}
				</span>

				<p class="mb-2 text-xl font-bold text-[var(--color-text-primary)]">{tr.saas.name}</p>

				<div class="mb-6 flex items-baseline gap-2">
					{#if price}
						<span class="text-4xl font-extrabold text-[var(--color-text-primary)]">
							{price.currency} {price.amount}
						</span>
						<span class="text-[var(--color-text-secondary)]">{tr.saas.priceLabel}</span>
					{:else}
						<span class="text-4xl font-extrabold text-[var(--color-text-primary)]">
							{tr.saas.fallbackPrice}
						</span>
					{/if}
				</div>

				<ul class="mb-8 flex-1 space-y-1">
					{#each tr.saas.features as feature}
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
					{tr.saas.cta}
				</a>

				<p class="mt-3 text-center text-sm text-[var(--color-text-tertiary)]">{tr.saas.note}</p>
			</div>

			<!-- Self-Hosted Card -->
			<div class="flex flex-1 flex-col rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-panel-alt)] p-8">
				<p class="mb-2 text-xl font-bold text-[var(--color-text-primary)]">{tr.selfHosted.name}</p>

				<div class="mb-6 flex items-baseline gap-2">
					<span class="text-4xl font-extrabold text-[var(--color-text-primary)]">
						{tr.selfHosted.price}
					</span>
				</div>

				<ul class="mb-8 flex-1 space-y-1">
					{#each tr.selfHosted.features as feature}
						<li class="flex items-center gap-3 py-1">
							<span class="font-semibold text-[var(--color-text-tertiary)]">✓</span>
							<span class="text-[var(--color-text-secondary)]">{feature}</span>
						</li>
					{/each}
				</ul>

				<a
					href={GITHUB_URL}
					target="_blank"
					rel="noopener noreferrer"
					class="block w-full rounded-xl border border-[var(--color-border-subtle)] py-3 text-center font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent-mid)] hover:text-[var(--color-accent-mid)]"
				>
					{tr.selfHosted.cta}
				</a>

				<p class="mt-3 text-center text-sm text-[var(--color-text-tertiary)]">{tr.selfHosted.note}</p>
			</div>
		</div>
	</div>
</section>
