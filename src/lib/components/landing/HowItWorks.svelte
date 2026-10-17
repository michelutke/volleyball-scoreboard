<script lang="ts">
	import { t } from '$lib/i18n/landing.js';
	import type { Lang } from '$lib/i18n/landing.js';
	import { reveal } from '$lib/motion.js';

	interface Props {
		lang: Lang;
	}

	let { lang }: Props = $props();

	const tr = $derived(t[lang].howItWorks);

	function splitStop(title: string): { text: string; ball: boolean } {
		return title.endsWith('.') ? { text: title.slice(0, -1), ball: true } : { text: title, ball: false };
	}
</script>

<section id="how-it-works" class="how">
	<div class="inner">
		<header class="head">
			<div class="head-main">
				<p class="kicker k-mono">{tr.kicker}</p>
				<h2 class="title k-display" use:reveal>{tr.title}</h2>
			</div>
			<p class="aside">{tr.aside}</p>
		</header>

		<ol class="steps">
			{#each tr.steps as step, i}
				{@const title = splitStop(step.title)}
				<li class="step" use:reveal={{ delay: i * 0.08 }}>
					<span class="numeral k-mono k-tabular">{String(i + 1).padStart(2, '0')}</span>
					<div class="copy">
						<h3 class="step-title">{title.text}{#if title.ball}<span class="ball"></span>{/if}</h3>
						<p class="step-desc">{step.desc}</p>
					</div>
				</li>
			{/each}
		</ol>
	</div>
</section>

<style>
	.how {
		background: var(--k-surface);
		color: var(--k-text);
		padding: 96px var(--grid-margin) 120px;
	}

	.inner {
		max-width: var(--container-max);
		margin: 0 auto;
	}

	.head {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-bottom: 48px;
	}

	.head-main {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.kicker {
		font-size: 10px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--k-text-dim);
		margin: 0;
	}

	.title {
		font-size: clamp(31px, 4.2vw, 61px);
		margin: 0;
		letter-spacing: -0.03em;
		line-height: 1;
	}

	.aside {
		font-size: 13px;
		color: var(--k-text-mute);
		margin: 0;
	}

	.steps {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: 1fr;
		gap: 0 32px;
	}

	.step {
		display: grid;
		grid-template-columns: 56px 1fr;
		gap: 16px;
		padding: 24px 0 32px;
		border-top: 1px solid var(--k-line);
	}

	.numeral {
		font-size: 25px;
		font-weight: 700;
		line-height: 1;
		color: var(--k-text);
	}

	.step-title {
		font-weight: var(--type-wght-bold);
		font-size: 20px;
		line-height: 1.2;
		margin: 0 0 8px;
		color: var(--k-text);
	}
	.ball {
		display: inline-block;
		width: 0.2em;
		height: 0.2em;
		margin-left: 0.06em;
		border-radius: 50%;
		background: var(--pulse);
	}

	.step-desc {
		font-size: 13px;
		line-height: 1.5;
		color: var(--k-text-mute);
		margin: 0;
		max-width: 36ch;
	}

	@media (min-width: 768px) {
		.head {
			flex-direction: row;
			align-items: flex-end;
			justify-content: space-between;
			margin-bottom: 64px;
		}
		.steps {
			grid-template-columns: repeat(3, 1fr);
		}
		.step {
			grid-template-columns: 1fr;
			gap: 24px;
			padding: 32px 0 0;
		}
		.numeral {
			font-size: 39px;
		}
		.step-desc {
			font-size: 13px;
		}
	}
</style>
