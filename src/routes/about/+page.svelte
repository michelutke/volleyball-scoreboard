<script lang="ts">
	import LandingNav from '$lib/components/landing/LandingNav.svelte';
	import LandingFooter from '$lib/components/landing/LandingFooter.svelte';
	import type { Lang } from '$lib/i18n/landing.js';
	import { reveal } from '$lib/motion.js';
	import { onMount } from 'svelte';
	import { animate, scroll, type DOMKeyframesDefinition } from 'motion';
	import Github from 'lucide-svelte/icons/git-fork';
	import ArrowRight from 'lucide-svelte/icons/arrow-right';

	let lang = $state<Lang>('de');

	const GITHUB_URL = 'https://github.com/michelutke/volleyball-scoreboard';

	// Unsplash stock — sport / streaming / collaboration / code, darkened via CSS
	const IMAGES = {
		vision:
			'https://images.unsplash.com/photo-1592656094267-7d29c1c2c1eb?auto=format&fit=crop&w=2000&q=70',
		mission:
			'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=2000&q=70',
		values:
			'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=2000&q=70',
		oss:
			'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=2000&q=70'
	};

	const content = {
		de: {
			overline: 'Über uns · About',
			title: 'Sport in motion.',
			vision: {
				heading: 'Vision',
				text: 'Jeder Schweizer Sportverein, unabhängig von Budget oder IT-Kenntnissen, begeistert seine Fans mit professionellen Livestreams im Broadcast-Look.'
			},
			mission: {
				heading: 'Mission',
				text: 'Lokaler Schweizer Sport verdient die gleiche professionelle Bühne wie die grossen Ligen. Ehrenamtliche Helfer*innen sollen dafür keine IT-Experten sein müssen. Mit Open-Source und SaaS machen wir hochwertige Scoring-Overlays zugänglich und einfach bedienbar.'
			},
			values: {
				heading: 'Kernwerte',
				lead: 'Was uns leitet, wenn wir entwickeln, gestalten und entscheiden.',
				items: [
					{
						title: 'Radikale Einfachheit',
						desc: 'Ehrenamtliche arbeiten unter Stress. Plug & Play und intuitiv. Kein IT-Background nötig.'
					},
					{
						title: 'Volles Community-Commitment',
						desc: 'Entwickelt mit Feedback der Vereine und Open-Source-Community. Die freie Variante bleibt das Fundament.'
					},
					{
						title: 'Swiss Leagues First',
						desc: 'Wir kennen den lokalen Sport und nutzen offizielle APIs für Schweizer Ligen.'
					},
					{
						title: 'Visual Excellence',
						desc: 'Kleines Budget bedeutet keine kleine Qualität. Moderner Broadcast-Look in jeder Turnhalle.'
					},
					{
						title: 'Meisterschaft durch Fokus',
						desc: 'Ein Problem richtig lösen, dann das nächste. Volleyball zuerst, weitere Sportarten Schritt für Schritt.'
					}
				]
			},
			oss: {
				heading: 'Open Source',
				text: 'Scorely ist quelloffen und steht jedem frei zur Verfügung. Wir glauben an offene Software für die Gemeinschaft. Contributions sind herzlich willkommen.',
				cta: 'Auf GitHub ansehen'
			}
		},
		en: {
			overline: 'About',
			title: 'Sport in motion.',
			vision: {
				heading: 'Vision',
				text: 'Every Swiss sports club, regardless of budget or IT knowledge, thrills its fans with professional broadcast-look livestreams.'
			},
			mission: {
				heading: 'Mission',
				text: 'Local Swiss sport deserves the same professional stage as the big leagues. Volunteers should not need to be IT experts to deliver it. With open source and SaaS, we make high-quality scoring overlays accessible and easy to use.'
			},
			values: {
				heading: 'Core Values',
				lead: 'What guides us when we build, design and decide.',
				items: [
					{
						title: 'Radical Simplicity',
						desc: 'Volunteers work under stress. Plug & play and intuitive. No IT background required.'
					},
					{
						title: 'Full Community Commitment',
						desc: 'Built with feedback from clubs and the open-source community. The free version stays the foundation.'
					},
					{
						title: 'Swiss Leagues First',
						desc: 'We know local sport and use the official APIs for Swiss leagues.'
					},
					{
						title: 'Visual Excellence',
						desc: 'A small budget does not mean small quality. Modern broadcast look in every sports hall.'
					},
					{
						title: 'Mastery through Focus',
						desc: 'Solve one problem properly, then the next. Volleyball first, more sports step by step.'
					}
				]
			},
			oss: {
				heading: 'Open Source',
				text: 'Scorely is open source and freely available. We believe in open software for the community. Contributions are very welcome.',
				cta: 'View on GitHub'
			}
		}
	} as const;

	const tr = $derived(content[lang]);

	let parallaxRoots = $state<HTMLElement[]>([]);

	onMount(() => {
		const motionScale = parseFloat(
			getComputedStyle(document.documentElement).getPropertyValue('--motion-scale')
		);
		if (!Number.isFinite(motionScale) || motionScale === 0) return;

		const cleanups: Array<() => void> = [];
		for (const root of parallaxRoots) {
			if (!root) continue;
			const img = root.querySelector<HTMLElement>('.bg-img');
			if (!img) continue;
			const stop = scroll(
				animate(
					img,
					{ transform: ['translateY(-8%)', 'translateY(8%)'] } as DOMKeyframesDefinition,
					{ duration: 1, ease: 'linear' }
				),
				{ target: root, offset: ['start end', 'end start'] }
			);
			cleanups.push(() => stop?.());
		}
		return () => cleanups.forEach((c) => c());
	});
</script>

<LandingNav {lang} onLangToggle={() => (lang = lang === 'de' ? 'en' : 'de')} basePath="/" />

<main class="page">
	<header class="hero">
		<div class="hero-inner">
			<p class="overline k-mono">{tr.overline}</p>
			<h1 class="title k-display" use:reveal={{ y: 32 }}>{tr.title}</h1>
		</div>
	</header>

	<section class="block" bind:this={parallaxRoots[0]}>
		<div class="bg" aria-hidden="true">
			<img src={IMAGES.vision} alt="" class="bg-img" loading="lazy" />
		</div>
		<div class="block-inner">
			<p class="kicker k-mono">01 · Vision</p>
			<h2 class="block-title k-display">{tr.vision.heading}</h2>
			<p class="block-text">{tr.vision.text}</p>
		</div>
	</section>

	<section class="block" bind:this={parallaxRoots[1]}>
		<div class="bg" aria-hidden="true">
			<img src={IMAGES.mission} alt="" class="bg-img" loading="lazy" />
		</div>
		<div class="block-inner">
			<p class="kicker k-mono">02 · Mission</p>
			<h2 class="block-title k-display">{tr.mission.heading}</h2>
			<p class="block-text">{tr.mission.text}</p>
		</div>
	</section>

	<section class="block tall" bind:this={parallaxRoots[2]}>
		<div class="bg" aria-hidden="true">
			<img src={IMAGES.values} alt="" class="bg-img" loading="lazy" />
		</div>
		<div class="block-inner">
			<p class="kicker k-mono">03 · Werte</p>
			<h2 class="block-title k-display">{tr.values.heading}</h2>
			<p class="block-text">{tr.values.lead}</p>

			<ol class="value-list">
				{#each tr.values.items as value, i}
					<li class="value-row" use:reveal={{ y: 24, delay: i * 0.06 }}>
						<span class="row-num k-mono">{String(i + 1).padStart(2, '0')}</span>
						<div class="row-body">
							<h3 class="row-title">{value.title}</h3>
							<p class="row-desc">{value.desc}</p>
						</div>
						<span class="row-bar" aria-hidden="true"></span>
					</li>
				{/each}
			</ol>
		</div>
	</section>

	<section class="block closer" bind:this={parallaxRoots[3]}>
		<div class="bg" aria-hidden="true">
			<img src={IMAGES.oss} alt="" class="bg-img" loading="lazy" />
		</div>
		<div class="block-inner">
			<p class="kicker k-mono">04 · Open Source</p>
			<h2 class="block-title k-display">{tr.oss.heading}</h2>
			<p class="block-text">{tr.oss.text}</p>
			<a class="cta" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
				<Github size="18" strokeWidth="1.5" />
				<span>{tr.oss.cta}</span>
				<ArrowRight size="16" strokeWidth="2" />
			</a>
		</div>
	</section>
</main>

<LandingFooter {lang} />

<style>
	.page {
		background: var(--k-surface);
		color: var(--k-text);
	}

	.hero {
		padding: 140px var(--grid-margin) 60px;
		border-bottom: 1px solid var(--k-line);
	}

	.hero-inner {
		max-width: var(--container-max);
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.overline,
	.kicker {
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--k-text-dim);
		margin: 0;
	}

	.title {
		font-size: clamp(48px, 9vw, 120px);
		line-height: 0.95;
		letter-spacing: -0.035em;
		margin: 0;
	}

	.block {
		position: relative;
		padding: 120px var(--grid-margin);
		isolation: isolate;
		overflow: hidden;
		border-bottom: 1px solid var(--k-line);
		color: var(--paper);
	}
	.block.tall {
		padding: 140px var(--grid-margin);
	}

	.bg {
		position: absolute;
		inset: -10% 0;
		z-index: -2;
		overflow: hidden;
	}
	.bg-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		filter: brightness(0.32) saturate(1.05) contrast(1.05);
		will-change: transform;
	}
	.bg::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
				to bottom,
				color-mix(in srgb, var(--ink) 55%, transparent) 0%,
				color-mix(in srgb, var(--ink) 30%, transparent) 50%,
				color-mix(in srgb, var(--ink) 70%, transparent) 100%
			),
			color-mix(in srgb, var(--ink) 25%, transparent);
		pointer-events: none;
	}

	.block-inner {
		max-width: 800px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 16px;
		position: relative;
	}
	.block-title {
		font-size: clamp(32px, 5vw, 56px);
		line-height: 1;
		letter-spacing: -0.025em;
		margin: 0;
		color: var(--paper);
	}
	.block-text {
		font-size: 17px;
		line-height: 1.6;
		color: color-mix(in srgb, var(--paper) 80%, transparent);
		margin: 0;
		max-width: 60ch;
	}

	.kicker {
		color: var(--pulse);
	}

	.value-list {
		list-style: none;
		padding: 0;
		margin: 32px 0 0;
		display: flex;
		flex-direction: column;
		border-top: 1px solid color-mix(in srgb, var(--paper) 16%, transparent);
	}

	.value-row {
		position: relative;
		display: grid;
		grid-template-columns: 56px 1fr;
		gap: 24px;
		padding: 28px 0;
		border-bottom: 1px solid color-mix(in srgb, var(--paper) 16%, transparent);
		transition: background var(--dur-fast) var(--ease-snap);
	}
	.value-row:hover {
		background: color-mix(in srgb, var(--paper) 4%, transparent);
	}
	.value-row:hover .row-bar {
		transform: scaleX(1);
	}

	.row-num {
		font-size: 12px;
		letter-spacing: 0.12em;
		color: var(--pulse);
		padding-top: 4px;
	}

	.row-body {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.row-title {
		font-family: var(--font-display);
		font-weight: var(--type-wght-bold);
		font-size: 22px;
		margin: 0;
		color: var(--paper);
		letter-spacing: -0.01em;
	}

	.row-desc {
		font-size: 15px;
		line-height: 1.6;
		color: color-mix(in srgb, var(--paper) 75%, transparent);
		margin: 0;
		max-width: 64ch;
	}

	.row-bar {
		position: absolute;
		left: 0;
		bottom: 0;
		height: 1px;
		width: 100%;
		background: var(--pulse);
		transform: scaleX(0);
		transform-origin: left;
		transition: transform var(--dur-mid) var(--ease-mass);
	}

	.closer {
		border-bottom: none;
	}

	.cta {
		align-self: flex-start;
		display: inline-flex;
		align-items: center;
		gap: 10px;
		margin-top: 16px;
		padding: 14px 26px;
		background: var(--pulse);
		color: var(--paper);
		text-decoration: none;
		font-weight: 600;
		font-size: 14px;
		border-radius: 999px;
		transition: background var(--dur-fast) var(--ease-snap);
	}
	.cta:hover {
		background: var(--pulse-deep);
	}

	:global([data-motion='static']) .bg-img {
		transform: none !important;
	}
</style>
