<script lang="ts">
	import LandingNav from '$lib/components/landing/LandingNav.svelte';
	import LandingFooter from '$lib/components/landing/LandingFooter.svelte';
	import type { Lang } from '$lib/i18n/landing.js';
	import { reveal } from '$lib/motion.js';
	import Zap from 'lucide-svelte/icons/zap';
	import Users from 'lucide-svelte/icons/users';
	import Globe from 'lucide-svelte/icons/globe';
	import Sparkles from 'lucide-svelte/icons/sparkles';
	import Target from 'lucide-svelte/icons/target';
	import Github from 'lucide-svelte/icons/git-fork';
	import ArrowRight from 'lucide-svelte/icons/arrow-right';

	let lang = $state<Lang>('de');

	const GITHUB_URL = 'https://github.com/michelutke/volleyball-scoreboard';

	const ICONS = [Zap, Users, Globe, Sparkles, Target] as const;

	const content = {
		de: {
			overline: '— Über uns / About',
			title: 'Sport in motion.',
			vision: {
				heading: 'Vision',
				text: 'Jeder Schweizer Sportverein, unabhängig von Budget oder IT-Kenntnissen, begeistert seine Fans mit professionellen Livestreams im Broadcast-Look.'
			},
			mission: {
				heading: 'Mission',
				text: 'Lokaler Schweizer Sport verdient die gleiche professionelle Bühne wie die grossen Ligen — ohne dass ehrenamtliche Helfer*innen IT-Experten sein müssen. Mit Open-Source und SaaS machen wir hochwertige Scoring-Overlays zugänglich und einfach bedienbar.'
			},
			values: {
				heading: 'Kernwerte',
				items: [
					{
						title: 'Radikale Einfachheit',
						desc: 'Ehrenamtliche arbeiten unter Stress. Plug & Play, intuitiv — kein IT-Background nötig.'
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
						desc: 'Kleines Budget ≠ kleine Qualität. Moderner Broadcast-Look in jeder Turnhalle.'
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
			overline: '— About',
			title: 'Sport in motion.',
			vision: {
				heading: 'Vision',
				text: 'Every Swiss sports club, regardless of budget or IT knowledge, thrills its fans with professional broadcast-look livestreams.'
			},
			mission: {
				heading: 'Mission',
				text: 'Local Swiss sport deserves the same professional stage as the big leagues — without volunteers needing to be IT experts. With open source and SaaS, we make high-quality scoring overlays accessible and easy to use.'
			},
			values: {
				heading: 'Core Values',
				items: [
					{
						title: 'Radical Simplicity',
						desc: 'Volunteers work under stress. Plug & play, intuitive — no IT background needed.'
					},
					{
						title: 'Full Community Commitment',
						desc: 'Built with feedback from clubs and the open-source community. The free version stays the foundation.'
					},
					{
						title: 'Swiss Leagues First',
						desc: "We know local sport and use the official APIs for Swiss leagues."
					},
					{
						title: 'Visual Excellence',
						desc: "A small budget doesn't mean small quality. Modern broadcast look in every sports hall."
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
</script>

<LandingNav {lang} onLangToggle={() => (lang = lang === 'de' ? 'en' : 'de')} basePath="/" />

<main class="page">
	<header class="hero">
		<div class="hero-inner">
			<p class="overline k-mono">{tr.overline}</p>
			<h1 class="title k-display" use:reveal={{ y: 32 }}>{tr.title}</h1>
		</div>
	</header>

	<section class="block">
		<div class="block-inner">
			<p class="kicker k-mono">— 01 / Vision</p>
			<h2 class="block-title k-display">{tr.vision.heading}</h2>
			<p class="block-text">{tr.vision.text}</p>
		</div>
	</section>

	<section class="block alt">
		<div class="block-inner">
			<p class="kicker k-mono">— 02 / Mission</p>
			<h2 class="block-title k-display">{tr.mission.heading}</h2>
			<p class="block-text">{tr.mission.text}</p>
		</div>
	</section>

	<section class="values">
		<div class="values-inner">
			<p class="kicker k-mono">— 03 / Werte</p>
			<h2 class="block-title k-display">{tr.values.heading}</h2>
			<div class="value-grid">
				{#each tr.values.items as value, i}
					{@const Icon = ICONS[i] ?? Zap}
					<article class="value-card" use:reveal={{ y: 28, delay: i * 0.05 }}>
						<span class="value-num k-mono">0{i + 1}</span>
						<Icon size="28" strokeWidth="1.5" class="value-icon" />
						<h3 class="value-title">{value.title}</h3>
						<p class="value-desc">{value.desc}</p>
						<span class="value-bar" aria-hidden="true"></span>
					</article>
				{/each}
			</div>
		</div>
	</section>

	<section class="block alt closer">
		<div class="block-inner">
			<p class="kicker k-mono">— 04 / Open Source</p>
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
		padding: 96px var(--grid-margin);
		background: var(--k-surface);
		border-bottom: 1px solid var(--k-line);
	}
	.block.alt {
		background: var(--k-surface-alt);
	}
	.block-inner {
		max-width: 800px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.block-title {
		font-size: clamp(32px, 5vw, 56px);
		line-height: 1;
		letter-spacing: -0.025em;
		margin: 0;
	}
	.block-text {
		font-size: 17px;
		line-height: 1.6;
		color: var(--k-text-mute);
		margin: 0;
		max-width: 60ch;
	}

	.values {
		padding: 96px var(--grid-margin);
	}
	.values-inner {
		max-width: var(--container-max);
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.value-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1px;
		background: var(--k-line);
		border: 1px solid var(--k-line);
		margin-top: 32px;
	}

	.value-card {
		position: relative;
		padding: 36px 28px;
		background: var(--k-surface);
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-height: 240px;
		overflow: hidden;
		transition: background var(--dur-mid) var(--ease-snap);
	}
	.value-card:hover {
		background: color-mix(in srgb, var(--k-text) 3%, var(--k-surface));
	}
	.value-card:hover .value-bar {
		transform: scaleY(1);
	}

	.value-num {
		font-size: 11px;
		letter-spacing: 0.12em;
		color: var(--k-text-dim);
	}

	:global(.value-icon) {
		color: var(--pulse);
	}

	.value-title {
		font-family: var(--font-display);
		font-weight: var(--type-wght-bold);
		font-size: 18px;
		margin: 0;
		color: var(--k-text);
		letter-spacing: -0.01em;
	}

	.value-desc {
		font-size: 14px;
		line-height: 1.55;
		color: var(--k-text-mute);
		margin: 0;
	}

	.value-bar {
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

	@media (min-width: 640px) {
		.value-grid {
			grid-template-columns: 1fr 1fr;
		}
	}
	@media (min-width: 1024px) {
		.value-grid {
			grid-template-columns: 1fr 1fr 1fr;
		}
	}
</style>
