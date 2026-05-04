<script lang="ts">
	import { t } from '$lib/i18n/landing.js';
	import type { Lang } from '$lib/i18n/landing.js';
	import { magnetic } from '$lib/motion.js';
	import { animate, type DOMKeyframesDefinition, type AnimationOptions } from 'motion';
	import { onMount } from 'svelte';

	interface Props {
		lang: Lang;
	}

	let { lang }: Props = $props();

	const headlineLines = $derived(t[lang].hero.headline.split('\n'));

	let lettersWrap = $state<HTMLDivElement | null>(null);

	function scrollToDemo(e: MouseEvent) {
		e.preventDefault();
		document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
	}

	onMount(() => {
		if (!lettersWrap) return;
		const isStatic =
			parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--motion-scale')) === 0;
		if (isStatic) return;
		const letters = Array.from(lettersWrap.querySelectorAll<HTMLElement>('.letter'));
		letters.forEach((el, i) => {
			el.style.opacity = '0';
			el.style.transform = 'translateY(40px)';
			animate(
				el,
				{ opacity: 1, transform: 'translateY(0px)' } as DOMKeyframesDefinition,
				{
					duration: 0.85,
					delay: 0.05 * i,
					ease: [0.16, 1, 0.3, 1]
				} as AnimationOptions
			);
		});
	});

	function splitLetters(line: string): { char: string; isSpace: boolean }[] {
		return [...line].map((char) => ({ char, isSpace: char === ' ' }));
	}
</script>

<section class="hero" id="hero">
	<div class="bg-gradient" aria-hidden="true"></div>
	<div class="bg-grid" aria-hidden="true"></div>

	<div class="content">
		<p class="overline k-mono">
			<span class="dot" aria-hidden="true"></span>
			Live · Volleyball · Echtzeit
		</p>

		<h1 class="headline k-display" bind:this={lettersWrap}>
			{#each headlineLines as line, lineIdx}
				<span class="line" class:second={lineIdx === 1}>
					{#each splitLetters(line) as { char, isSpace }}
						{#if isSpace}
							<span class="space">&nbsp;</span>
						{:else}
							<span class="letter">{char}</span>
						{/if}
					{/each}
				</span>
			{/each}
		</h1>

		<p class="sub">{t[lang].hero.sub}</p>

		<div class="ctas">
			<a href="/signup" class="cta-primary" use:magnetic={{ strength: 0.2, radius: 80 }}>
				<span>{t[lang].hero.ctaPrimary}</span>
				<span class="arrow" aria-hidden="true">→</span>
			</a>
			<a href="#demo" onclick={scrollToDemo} class="cta-secondary">
				<span>{t[lang].hero.ctaSecondary}</span>
			</a>
		</div>

		<p class="proof k-mono">{t[lang].hero.socialProof}</p>
	</div>

	<div class="ticker" aria-hidden="true">
		<div class="ticker-track">
			{#each Array(2) as _, dup}
				<div class="ticker-row">
					<span class="tick"><b>VBC THUN</b> 25 <em>—</em> 22 <b>SPIEZ</b></span>
					<span class="sep">/</span>
					<span class="tick"><b>NUC</b> 18 <em>—</em> 25 <b>VOLERO</b></span>
					<span class="sep">/</span>
					<span class="tick"><b>LUC</b> 25 <em>—</em> 19 <b>BERN</b></span>
					<span class="sep">/</span>
					<span class="tick"><b>SET POINT</b></span>
					<span class="sep">/</span>
					<span class="tick"><b>FRANCHES</b> 23 <em>—</em> 25 <b>AESCH</b></span>
					<span class="sep">/</span>
					<span class="tick"><b>KÖNIZ</b> 25 <em>—</em> 21 <b>SAFNERN</b></span>
					<span class="sep">/</span>
				</div>
			{/each}
		</div>
	</div>

	<div class="scroll-cue" aria-hidden="true">
		<span class="cue-line"></span>
	</div>
</section>

<style>
	.hero {
		position: relative;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: 120px var(--grid-margin) 80px;
		background: var(--k-surface);
		color: var(--k-text);
		overflow: hidden;
		isolation: isolate;
	}

	.bg-gradient {
		position: absolute;
		inset: -10%;
		background: radial-gradient(
				ellipse 60% 50% at 80% 10%,
				color-mix(in srgb, var(--pulse) 18%, transparent) 0%,
				transparent 60%
			),
			radial-gradient(
				ellipse 50% 40% at 10% 90%,
				color-mix(in srgb, var(--cool) 12%, transparent) 0%,
				transparent 65%
			);
		z-index: -2;
		pointer-events: none;
	}

	.bg-grid {
		position: absolute;
		inset: 0;
		background-image: linear-gradient(
				to right,
				color-mix(in srgb, var(--k-line) 60%, transparent) 1px,
				transparent 1px
			),
			linear-gradient(to bottom, color-mix(in srgb, var(--k-line) 60%, transparent) 1px, transparent 1px);
		background-size: 80px 80px;
		mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 80%);
		-webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 80%);
		opacity: 0.4;
		z-index: -1;
		pointer-events: none;
	}

	.content {
		max-width: var(--container-max);
		margin: 0 auto;
		width: 100%;
	}

	.overline {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--k-text-mute);
		margin-bottom: 32px;
	}
	.overline .dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--pulse);
		animation: pulse-blink 1.6s var(--ease-glide) infinite;
	}
	@keyframes pulse-blink {
		0%, 70%, 100% { opacity: 1; }
		50% { opacity: 0.3; }
	}
	:global([data-motion='static']) .overline .dot,
	:global([data-motion='damped']) .overline .dot { animation: none; }

	.headline {
		font-size: clamp(48px, 11vw, 168px);
		line-height: 0.92;
		margin: 0 0 36px;
		letter-spacing: -0.035em;
	}
	.headline .line {
		display: block;
	}
	.headline .line.second {
		color: var(--k-text-mute);
		font-variation-settings: 'wght' 580, 'opsz' 36;
	}
	.headline .letter {
		display: inline-block;
		will-change: transform, opacity;
		font-variation-settings: 'wght' 780, 'opsz' 36;
	}
	.headline .line.second .letter {
		font-variation-settings: 'wght' 560, 'opsz' 36;
	}
	.headline .space {
		display: inline-block;
		width: 0.25em;
	}

	.sub {
		max-width: 640px;
		font-size: clamp(16px, 1.3vw, 19px);
		line-height: 1.55;
		color: var(--k-text-mute);
		margin: 0 0 44px;
	}

	.ctas {
		display: flex;
		flex-wrap: wrap;
		gap: 14px;
		align-items: center;
		margin-bottom: 48px;
	}

	.cta-primary {
		display: inline-flex;
		align-items: center;
		gap: 12px;
		background: var(--pulse);
		color: var(--paper);
		text-decoration: none;
		font-weight: 600;
		font-size: 16px;
		padding: 16px 28px;
		border-radius: 999px;
		will-change: transform;
		transition: background var(--dur-fast) var(--ease-snap);
		position: relative;
		overflow: hidden;
	}
	.cta-primary:hover {
		background: var(--pulse-deep);
	}
	.cta-primary .arrow {
		transition: transform var(--dur-mid) var(--ease-snap);
	}
	.cta-primary:hover .arrow {
		transform: translateX(4px);
	}

	.cta-secondary {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		color: var(--k-text);
		text-decoration: none;
		font-weight: 500;
		font-size: 15px;
		padding: 16px 22px;
		border-radius: 999px;
		border: 1px solid var(--k-line);
		transition: border-color var(--dur-fast) var(--ease-snap),
			background var(--dur-fast) var(--ease-snap);
	}
	.cta-secondary:hover {
		border-color: var(--k-text-mute);
		background: color-mix(in srgb, var(--k-text) 4%, transparent);
	}

	.proof {
		font-size: 11px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--k-text-dim);
		margin: 0;
	}

	.ticker {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 80px;
		overflow: hidden;
		mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
		-webkit-mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
		pointer-events: none;
		z-index: -1;
		opacity: 0.4;
	}
	.ticker-track {
		display: flex;
		animation: ticker 38s linear infinite;
		width: max-content;
	}
	.ticker-row {
		display: flex;
		gap: 32px;
		padding-right: 32px;
		font-family: var(--font-mono);
		font-size: 13px;
		letter-spacing: 0.06em;
		color: var(--k-text-dim);
		white-space: nowrap;
	}
	.tick b {
		color: var(--k-text-mute);
		font-weight: 600;
	}
	.tick em {
		font-style: normal;
		color: var(--pulse);
		margin: 0 2px;
	}
	.sep {
		color: var(--k-line);
	}
	@keyframes ticker {
		from { transform: translateX(0); }
		to { transform: translateX(-50%); }
	}
	:global([data-motion='static']) .ticker-track,
	:global([data-motion='damped']) .ticker-track {
		animation-duration: 120s;
	}
	:global([data-motion='static']) .ticker {
		display: none;
	}

	.scroll-cue {
		position: absolute;
		left: 50%;
		bottom: 24px;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.cue-line {
		width: 1px;
		height: 56px;
		background: linear-gradient(
			to bottom,
			transparent 0%,
			var(--k-text-dim) 50%,
			transparent 100%
		);
		animation: cue 2.8s var(--ease-glide) infinite;
	}
	@keyframes cue {
		0% { transform: translateY(-12px); opacity: 0; }
		40%, 60% { opacity: 1; }
		100% { transform: translateY(12px); opacity: 0; }
	}
	:global([data-motion='static']) .cue-line,
	:global([data-motion='damped']) .cue-line {
		animation: none;
	}
</style>
