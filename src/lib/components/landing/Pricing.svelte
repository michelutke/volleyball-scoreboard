<script lang="ts">
	import type { Lang } from '$lib/i18n/landing.js';
	import { countUp, magnetic, reveal } from '$lib/motion.js';

	interface Props {
		lang: Lang;
		price: { amount: number; currency: string } | null;
	}

	let { lang, price }: Props = $props();

	const GITHUB_URL = 'https://github.com/michelutke/volleyball-scoreboard';

	const translations = {
		de: {
			overline: '— Preise',
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
				note: 'Keine Kreditkarte · Jederzeit kündbar',
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
				note: 'Contributions willkommen'
			}
		},
		en: {
			overline: '— Pricing',
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
				note: 'No credit card · Cancel anytime',
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
				note: 'Contributions welcome'
			}
		}
	} as const;

	const tr = $derived(translations[lang]);
</script>

<section id="pricing" class="pricing">
	<div class="inner">
		<header class="head">
			<p class="overline k-mono">{tr.overline}</p>
			<h2 class="title k-display" use:reveal={{ y: 32 }}>{tr.title}</h2>
		</header>

		<div class="cards">
			<article class="card saas" use:reveal={{ y: 40 }}>
				<span class="badge k-mono">{tr.saas.badge}</span>

				<header class="card-head">
					<p class="kicker k-mono">01 / SaaS</p>
					<h3 class="card-title">{tr.saas.name}</h3>
				</header>

				<div class="price-row">
					{#if price}
						<span class="currency k-mono">{price.currency}</span>
						<span
							class="amount k-mono k-tabular"
							use:countUp={{ to: price.amount, format: (n) => Math.round(n).toString() }}
						></span>
						<span class="period">{tr.saas.priceLabel}</span>
					{:else}
						<span class="amount k-mono">{tr.saas.fallbackPrice}</span>
					{/if}
				</div>

				<ul class="features">
					{#each tr.saas.features as feature}
						<li>
							<span class="tick" aria-hidden="true">→</span>
							<span>{feature}</span>
						</li>
					{/each}
				</ul>

				<a href="/signup" class="cta-primary" use:magnetic={{ strength: 0.2, radius: 60 }}>
					<span>{tr.saas.cta}</span>
					<span class="arrow" aria-hidden="true">→</span>
				</a>

				<p class="note k-mono">{tr.saas.note}</p>
			</article>

			<article class="card self" use:reveal={{ y: 40, delay: 0.08 }}>
				<header class="card-head">
					<p class="kicker k-mono">02 / Open Source</p>
					<h3 class="card-title">{tr.selfHosted.name}</h3>
				</header>

				<div class="price-row">
					<span class="amount k-mono">{tr.selfHosted.price}</span>
				</div>

				<ul class="features">
					{#each tr.selfHosted.features as feature}
						<li>
							<span class="tick" aria-hidden="true">→</span>
							<span>{feature}</span>
						</li>
					{/each}
				</ul>

				<a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" class="cta-secondary">
					<span>{tr.selfHosted.cta}</span>
					<span class="arrow" aria-hidden="true">→</span>
				</a>

				<p class="note k-mono">{tr.selfHosted.note}</p>
			</article>
		</div>
	</div>
</section>

<style>
	.pricing {
		background: var(--k-surface);
		color: var(--k-text);
		padding: 140px var(--grid-margin);
	}

	.inner {
		max-width: var(--container-max);
		margin: 0 auto;
	}

	.head {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-bottom: 72px;
		text-align: center;
		align-items: center;
	}

	.overline {
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--k-text-dim);
		margin: 0;
	}

	.title {
		font-size: clamp(36px, 6vw, 80px);
		margin: 0;
		letter-spacing: -0.03em;
		line-height: 0.95;
	}

	.cards {
		display: grid;
		grid-template-columns: 1fr;
		gap: 24px;
		max-width: 960px;
		margin: 0 auto;
	}

	.card {
		position: relative;
		padding: 48px 36px 36px;
		background: var(--k-surface-alt);
		display: flex;
		flex-direction: column;
		gap: 28px;
		transition: transform var(--dur-mid) var(--ease-snap),
			border-color var(--dur-mid) var(--ease-snap);
	}

	.card.saas {
		border: 2px solid var(--pulse);
	}
	.card.saas:hover {
		border-color: var(--pulse-deep);
	}

	.card.self {
		border: 1px solid var(--k-line);
	}
	.card.self:hover {
		border-color: var(--k-text-mute);
	}

	.badge {
		position: absolute;
		top: -12px;
		left: 24px;
		background: var(--pulse);
		color: var(--paper);
		font-size: 10px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		padding: 6px 12px;
		font-weight: 600;
	}

	.kicker {
		font-size: 11px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--k-text-dim);
		margin: 0 0 8px;
	}

	.card-title {
		font-family: var(--font-display);
		font-weight: var(--type-wght-bold);
		font-size: 24px;
		margin: 0;
		color: var(--k-text);
	}

	.price-row {
		display: flex;
		align-items: baseline;
		gap: 10px;
		flex-wrap: wrap;
		padding: 16px 0;
		border-top: 1px solid var(--k-line);
		border-bottom: 1px solid var(--k-line);
	}

	.currency {
		font-size: 18px;
		color: var(--k-text-mute);
		font-weight: 500;
	}
	.amount {
		font-size: clamp(56px, 8vw, 88px);
		font-weight: 600;
		color: var(--k-text);
		letter-spacing: -0.04em;
		line-height: 1;
	}
	.period {
		font-size: 14px;
		color: var(--k-text-dim);
	}

	.features {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 12px;
		flex: 1;
	}
	.features li {
		display: flex;
		align-items: baseline;
		gap: 14px;
		font-size: 15px;
		color: var(--k-text-mute);
	}
	.tick {
		color: var(--cool);
		font-family: var(--font-mono);
		font-weight: 600;
		font-size: 14px;
	}
	.card.saas .tick {
		color: var(--pulse);
	}

	.cta-primary,
	.cta-secondary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		text-decoration: none;
		font-weight: 600;
		font-size: 15px;
		padding: 16px 24px;
		will-change: transform;
		transition: background var(--dur-fast) var(--ease-snap),
			border-color var(--dur-fast) var(--ease-snap);
	}

	.cta-primary {
		background: var(--cool);
		color: var(--paper);
	}
	.cta-primary:hover {
		background: var(--cool-deep);
	}

	.cta-secondary {
		background: transparent;
		color: var(--k-text);
		border: 1px solid var(--k-line);
	}
	.cta-secondary:hover {
		border-color: var(--k-text-mute);
		background: color-mix(in srgb, var(--k-text) 4%, transparent);
	}

	.cta-primary .arrow,
	.cta-secondary .arrow {
		transition: transform var(--dur-mid) var(--ease-snap);
	}
	.cta-primary:hover .arrow,
	.cta-secondary:hover .arrow {
		transform: translateX(4px);
	}

	.note {
		font-size: 11px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--k-text-dim);
		margin: 0;
		text-align: center;
	}

	@media (min-width: 768px) {
		.cards {
			grid-template-columns: 1fr 1fr;
			align-items: stretch;
		}
		.head {
			text-align: left;
			align-items: flex-start;
		}
	}
</style>
