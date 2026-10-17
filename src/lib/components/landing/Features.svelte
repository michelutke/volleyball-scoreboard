<script lang="ts">
	import { t } from '$lib/i18n/landing.js';
	import type { Lang } from '$lib/i18n/landing.js';
	import { reveal } from '$lib/motion.js';
	import Pictogram from '$lib/components/brand/Pictogram.svelte';
	import type { PictogramName } from '$lib/brand/pictograms.js';

	interface Props {
		lang: Lang;
	}

	let { lang }: Props = $props();
</script>

<section id="features" class="features">
	<div class="inner">
		<header class="head">
			<p class="overline k-mono">Funktionen · Features</p>
			<h2 class="title k-display" use:reveal>
				{t[lang].features.title}
			</h2>
		</header>

		<div class="grid">
			{#each t[lang].features.items as item, i}
				<article class="card" data-idx={i} use:reveal={{ delay: i * 0.05 }}>
					<span class="label k-mono">0{i + 1}</span>
					<div class="icon" aria-hidden="true">
						<Pictogram name={item.icon as PictogramName} size={48} />
					</div>
					<h3 class="card-title">{item.title}</h3>
					<p class="card-desc">{item.desc}</p>
				</article>
			{/each}
		</div>
	</div>
</section>

<style>
	.features {
		background: var(--k-surface);
		color: var(--k-text);
		padding: 120px var(--grid-margin);
		position: relative;
	}

	.inner {
		max-width: var(--container-max);
		margin: 0 auto;
	}

	.head {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-bottom: 64px;
		max-width: 800px;
	}

	.overline {
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--k-text-dim);
		margin: 0;
	}

	.title {
		font-size: clamp(31px, 4.2vw, 61px);
		margin: 0;
		letter-spacing: -0.03em;
		line-height: 0.95;
	}

	.grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1px;
		background: var(--k-line);
		border: 1px solid var(--k-line);
	}

	.card {
		position: relative;
		padding: 40px 32px;
		background: var(--k-surface);
		display: flex;
		flex-direction: column;
		gap: 16px;
		min-height: 280px;
		transition: background var(--dur-mid) var(--ease-snap);
		cursor: default;
	}
	.card:hover {
		background: color-mix(in srgb, var(--k-text) 3%, var(--k-surface));
	}

	.label {
		font-size: 12px;
		letter-spacing: 0.1em;
		color: var(--k-text-dim);
	}

	.icon {
		color: var(--k-text);
		display: inline-flex;
	}

	.card-title {
		font-family: var(--font-display);
		font-weight: var(--type-wght-bold);
		font-size: 22px;
		margin: 0;
		color: var(--k-text);
		letter-spacing: -0.01em;
	}

	.card-desc {
		font-size: 15px;
		line-height: 1.55;
		color: var(--k-text-mute);
		margin: 0;
	}

	@media (min-width: 640px) {
		.grid {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
