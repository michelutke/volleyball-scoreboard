<script lang="ts">
	import type { Lang } from '$lib/i18n/landing.js';
	import { magnetic, reveal } from '$lib/motion.js';

	interface Props {
		lang: Lang;
	}

	let { lang }: Props = $props();

	const translations = {
		de: {
			tagline: 'Score in motion.',
			cta: 'Kostenlos testen →',
			subline: 'Volleyball-Scoring für deinen Stream. Live. Echtzeit.',
			copyright: '© 2026 Scorely',
			links: [
				{ label: 'Datenschutz', href: '/privacy' },
				{ label: 'Impressum', href: '/imprint' },
				{ label: 'Bibliothek', href: '/library' }
			]
		},
		en: {
			tagline: 'Score in motion.',
			cta: 'Try for free →',
			subline: 'Volleyball scoring for your stream. Live. Real-time.',
			copyright: '© 2026 Scorely',
			links: [
				{ label: 'Privacy', href: '/privacy' },
				{ label: 'Imprint', href: '/imprint' },
				{ label: 'Library', href: '/library' }
			]
		}
	} as const;

	const tr = $derived(translations[lang]);
</script>

<footer class="footer">
	<div class="inner">
		<div class="closer" use:reveal={{ y: 32 }}>
			<p class="kicker k-mono">— Bereit zu scoren / Ready to score</p>
			<h2 class="big-mark k-display">{tr.tagline}</h2>
			<p class="subline">{tr.subline}</p>
			<a href="/signup" class="cta" use:magnetic={{ strength: 0.18, radius: 70 }}>
				<span>{tr.cta}</span>
			</a>
		</div>

		<div class="meta">
			<span class="brand k-display">Scorely<span class="dot" aria-hidden="true"></span></span>
			<p class="copyright k-mono">{tr.copyright}</p>
			<div class="links">
				{#each tr.links as link}
					<a href={link.href}>{link.label}</a>
				{/each}
			</div>
		</div>
	</div>
</footer>

<style>
	.footer {
		background: var(--k-surface-alt);
		color: var(--k-text);
		padding: 120px var(--grid-margin) 48px;
		border-top: 1px solid var(--k-line);
		overflow: hidden;
	}

	.inner {
		max-width: var(--container-max);
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 88px;
	}

	.closer {
		display: flex;
		flex-direction: column;
		gap: 24px;
		align-items: flex-start;
	}

	.kicker {
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--k-text-dim);
		margin: 0;
	}

	.big-mark {
		font-size: clamp(56px, 14vw, 200px);
		line-height: 0.9;
		margin: 0;
		letter-spacing: -0.04em;
		color: var(--k-text);
		font-variation-settings: 'wght' 800, 'opsz' 36;
	}

	.subline {
		font-size: clamp(16px, 1.4vw, 20px);
		color: var(--k-text-mute);
		margin: 0;
		max-width: 560px;
	}

	.cta {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		background: var(--pulse);
		color: var(--paper);
		text-decoration: none;
		font-weight: 600;
		font-size: 16px;
		padding: 18px 30px;
		border-radius: 999px;
		margin-top: 8px;
		will-change: transform;
		transition: background var(--dur-fast) var(--ease-snap);
	}
	.cta:hover {
		background: var(--pulse-deep);
	}

	.meta {
		display: flex;
		flex-direction: column;
		gap: 24px;
		padding-top: 36px;
		border-top: 1px solid var(--k-line);
	}

	.brand {
		font-size: 22px;
		font-weight: var(--type-wght-bold);
		letter-spacing: -0.02em;
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.brand .dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--pulse);
	}

	.copyright {
		font-size: 12px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--k-text-dim);
		margin: 0;
	}

	.links {
		display: flex;
		gap: 24px;
		flex-wrap: wrap;
	}
	.links a {
		font-size: 13px;
		color: var(--k-text-mute);
		text-decoration: none;
		transition: color var(--dur-fast) var(--ease-snap);
	}
	.links a:hover {
		color: var(--k-text);
	}

	@media (min-width: 768px) {
		.meta {
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
		}
	}
</style>
