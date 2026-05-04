<script lang="ts">
	import { t } from '$lib/i18n/landing.js';
	import type { Lang } from '$lib/i18n/landing.js';
	import { reveal } from '$lib/motion.js';
	import Radio from 'lucide-svelte/icons/radio';
	import BellRing from 'lucide-svelte/icons/bell-ring';
	import Timer from 'lucide-svelte/icons/timer';
	import Database from 'lucide-svelte/icons/database';

	interface Props {
		lang: Lang;
	}

	let { lang }: Props = $props();

	const ICONS = {
		radio: Radio,
		'bell-ring': BellRing,
		timer: Timer,
		database: Database
	} as const;

	function pickIcon(key: string) {
		return ICONS[key as keyof typeof ICONS] ?? Radio;
	}
</script>

<section id="features" class="features">
	<div class="inner">
		<header class="head">
			<p class="overline k-mono">Funktionen · Features</p>
			<h2 class="title k-display" use:reveal={{ y: 32 }}>
				{t[lang].features.title}
			</h2>
		</header>

		<div class="grid">
			{#each t[lang].features.items as item, i}
				{@const Icon = pickIcon(item.icon)}
				<article class="card" data-idx={i} use:reveal={{ y: 36, x: i % 2 ? 24 : -24, delay: i * 0.05 }}>
					<span class="label k-mono">0{i + 1}</span>
					<div class="icon" aria-hidden="true">
						<Icon size="32" strokeWidth="1.5" />
					</div>
					<h3 class="card-title">{item.title}</h3>
					<p class="card-desc">{item.desc}</p>
					<span class="bar" aria-hidden="true"></span>
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
		font-size: clamp(36px, 6vw, 80px);
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
		overflow: hidden;
	}
	.card:hover {
		background: color-mix(in srgb, var(--k-text) 3%, var(--k-surface));
	}
	.card:hover .bar {
		transform: scaleY(1);
	}
	.card:hover .label {
		color: var(--pulse);
		transform: translateX(0);
	}
	.card:hover .card-title {
		transform: translateX(4px);
	}

	.label {
		font-size: 12px;
		letter-spacing: 0.1em;
		color: var(--k-text-dim);
		transform: translateX(-4px);
		transition: color var(--dur-fast) var(--ease-snap),
			transform var(--dur-mid) var(--ease-snap);
	}

	.icon {
		color: var(--pulse);
		display: inline-flex;
	}

	.card-title {
		font-family: var(--font-display);
		font-weight: var(--type-wght-bold);
		font-size: 22px;
		margin: 0;
		color: var(--k-text);
		letter-spacing: -0.01em;
		transition: transform var(--dur-mid) var(--ease-snap);
	}

	.card-desc {
		font-size: 15px;
		line-height: 1.55;
		color: var(--k-text-mute);
		margin: 0;
	}

	.bar {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 3px;
		background: var(--pulse);
		transform: scaleY(0);
		transform-origin: top;
		transition: transform var(--dur-mid) var(--ease-mass);
	}

	@media (min-width: 640px) {
		.grid {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
