<script lang="ts">
	import { t } from '$lib/i18n/landing.js';
	import type { Lang } from '$lib/i18n/landing.js';
	import { reveal } from '$lib/motion.js';

	interface Props {
		lang: Lang;
	}

	let { lang }: Props = $props();
</script>

<section id="how-it-works" class="how">
	<div class="bg-tint" aria-hidden="true"></div>
	<div class="inner">
		<header class="head">
			<p class="overline k-mono">Ablauf · Workflow</p>
			<h2 class="title k-display" use:reveal={{ y: 32 }}>
				{t[lang].howItWorks.title}
			</h2>
		</header>

		<ol class="steps">
			{#each t[lang].howItWorks.steps as step, i}
				<li class="step" use:reveal={{ y: 48, delay: i * 0.08 }}>
					<div class="numeral-wrap">
						<span class="numeral k-mono k-tabular">{String(i + 1).padStart(2, '0')}</span>
						<span class="numeral-line" aria-hidden="true"></span>
					</div>
					<div class="copy">
						<h3 class="step-title">{step.title}</h3>
						<p class="step-desc">{step.desc}</p>
					</div>
					<span class="rule" aria-hidden="true"></span>
				</li>
			{/each}
		</ol>
	</div>
</section>

<style>
	.how {
		position: relative;
		background: var(--k-surface-alt);
		color: var(--k-text);
		padding: 140px var(--grid-margin);
		overflow: hidden;
	}

	.bg-tint {
		position: absolute;
		inset: 0;
		background: radial-gradient(
			ellipse 60% 80% at 90% 50%,
			color-mix(in srgb, var(--pulse) 14%, transparent) 0%,
			transparent 60%
		);
		pointer-events: none;
	}

	.inner {
		max-width: var(--container-max);
		margin: 0 auto;
		position: relative;
	}

	.head {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-bottom: 80px;
		max-width: 800px;
	}

	.overline {
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--pulse);
		margin: 0;
	}

	.title {
		font-size: clamp(36px, 6vw, 80px);
		margin: 0;
		letter-spacing: -0.03em;
		line-height: 0.95;
	}

	.steps {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}

	.step {
		display: grid;
		grid-template-columns: minmax(140px, 22%) 1fr;
		gap: 32px;
		padding: 56px 0;
		align-items: start;
		position: relative;
	}
	.step:last-child .rule {
		display: none;
	}

	.numeral-wrap {
		display: flex;
		flex-direction: column;
		gap: 14px;
		align-items: flex-start;
	}

	.numeral {
		font-size: clamp(56px, 10vw, 140px);
		font-weight: 600;
		line-height: 0.9;
		color: var(--pulse);
		letter-spacing: -0.04em;
	}

	.numeral-line {
		display: block;
		width: 64px;
		height: 2px;
		background: var(--pulse);
	}

	.copy {
		padding-top: 8px;
	}

	.step-title {
		font-family: var(--font-display);
		font-weight: var(--type-wght-bold);
		font-size: clamp(24px, 3vw, 36px);
		margin: 0 0 12px;
		color: var(--k-text);
		letter-spacing: -0.01em;
	}

	.step-desc {
		font-size: 16px;
		line-height: 1.6;
		color: var(--k-text-mute);
		margin: 0;
		max-width: 520px;
	}

	.rule {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 1px;
		background: linear-gradient(
			to right,
			transparent 0%,
			var(--k-line) 20%,
			var(--k-line) 80%,
			transparent 100%
		);
	}

	@media (max-width: 640px) {
		.step {
			grid-template-columns: 1fr;
			gap: 16px;
			padding: 40px 0;
		}
		.numeral {
			font-size: 72px;
		}
	}
</style>
