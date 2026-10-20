<script lang="ts">
	import { t } from '$lib/i18n/landing.js';
	import type { Lang } from '$lib/i18n/landing.js';
	import { land, press } from '$lib/motion.js';
	import { COLON_SLIDE_MS } from '$lib/brand/reveal.js';
	import Demo from './Demo.svelte';
	import HeroMark from './HeroMark.svelte';
	import { onMount } from 'svelte';

	interface Props {
		lang: Lang;
	}

	let { lang }: Props = $props();

	const STAGGER_MS = 80;

	const headline = $derived(t[lang].hero.headline.replace(/\.$/, ''));
	const lines = $derived(headline.split('\n').map((line) => line.split(' ')));

	let headlineEl = $state<HTMLHeadingElement | null>(null);

	function scrollToDemo(e: MouseEvent) {
		e.preventDefault();
		document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
	}

	onMount(() => {
		if (!headlineEl) return;
		const parts = Array.from(headlineEl.querySelectorAll<HTMLElement>('.word, .ball'));
		parts.forEach((el, i) => land(el, { delay: COLON_SLIDE_MS + i * STAGGER_MS }));
	});
</script>

<section class="hero" id="hero">
	<div class="content">
		<div class="top">
			<div class="mark">
				<HeroMark />
			</div>

			<div class="intro">
			<p class="kicker k-mono">{t[lang].hero.kicker}</p>

			<h1 class="headline k-display" bind:this={headlineEl} aria-label={t[lang].hero.headline.replace('\n', ' ')}>
				{#each lines as words, lineIdx}
					<span class="line" class:second={lineIdx === 1} aria-hidden="true">
						{#each words as word, wordIdx}
							<span class="word">{word}</span>{#if wordIdx < words.length - 1}{' '}{/if}
						{/each}{#if lineIdx === lines.length - 1}<span class="ball"></span>{/if}
					</span>
				{/each}
			</h1>
			</div>
		</div>

		<div class="lower">
			<div class="copy">
				<p class="sub">{t[lang].hero.sub}</p>

				<div class="ctas">
					<a href="/signup" class="cta-primary" use:press>
						<span>{t[lang].hero.ctaPrimary} →</span>
					</a>
					<a href="#demo" onclick={scrollToDemo} class="cta-secondary">
						<span>{t[lang].hero.ctaSecondary}</span>
					</a>
				</div>

				<p class="proof k-mono">{t[lang].hero.socialProof}</p>
			</div>

			<Demo {lang} />
		</div>
	</div>
</section>

<style>
	.hero {
		background: var(--k-surface);
		color: var(--k-text);
		padding: 96px var(--grid-margin) 80px;
	}

	.content {
		max-width: var(--container-max);
		margin: 0 auto;
		width: 100%;
	}

	.top {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-bottom: 32px;
	}

	.mark {
		line-height: 0;
		margin-left: -17px;
	}

	.kicker {
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--k-text-mute);
		margin: 0 0 20px;
	}

	.headline {
		font-size: clamp(39px, 7vw, 96px);
		line-height: 0.95;
		margin: 0;
		letter-spacing: -0.035em;
		font-weight: var(--type-wght-display);
	}
	.headline .line {
		display: block;
	}
	.headline .line.second {
		color: var(--k-text-mute);
	}
	.headline .word {
		display: inline-block;
		will-change: transform, opacity;
	}
	.headline .ball {
		display: inline-block;
		width: 0.17em;
		height: 0.17em;
		margin-left: 0.04em;
		border-radius: 50%;
		background: var(--pulse);
	}

	.lower {
		display: grid;
		grid-template-columns: 1fr;
		gap: 48px;
		align-items: start;
	}

	.sub {
		max-width: 46ch;
		font-size: 16px;
		line-height: 1.5;
		color: var(--k-text-mute);
		margin: 0 0 32px;
	}

	.ctas {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-bottom: 32px;
	}

	.cta-primary,
	.cta-secondary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		text-decoration: none;
		border-radius: 999px;
		font-size: 15px;
		padding: 15px 28px;
	}

	.cta-primary {
		background: var(--pulse);
		color: var(--paper);
		font-weight: var(--type-wght-bold);
		will-change: transform;
		transition: background var(--dur-fast) var(--ease-snap);
	}
	.cta-primary:hover {
		background: var(--pulse-soft);
	}

	.cta-secondary {
		color: var(--k-text);
		font-weight: var(--type-wght-medium);
		border: 1px solid var(--k-text);
		transition: background var(--dur-fast) var(--ease-snap),
			color var(--dur-fast) var(--ease-snap);
	}
	.cta-secondary:hover {
		background: var(--k-text);
		color: var(--k-surface);
	}

	.proof {
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--k-text-dim);
		margin: 0;
	}

	@media (min-width: 1024px) {
		.top {
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
			gap: 64px;
		}
		.mark {
			order: 2;
			flex: none;
			margin-left: 0;
			margin-right: -38px;
		}
		.intro {
			flex: 1;
			min-width: 0;
		}
	}

	@media (min-width: 640px) {
		.hero {
			padding-top: 128px;
		}
		.top {
			gap: 20px;
		}
		.ctas {
			flex-direction: row;
			align-items: center;
		}
		.cta-primary,
		.cta-secondary {
			padding: 14px 24px;
		}
	}

	@media (min-width: 960px) {
		.hero {
			padding-top: 160px;
		}
		.top {
			margin-bottom: 56px;
		}
		.lower {
			grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
			gap: 64px;
		}
	}
</style>
