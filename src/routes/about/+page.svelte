<script lang="ts">
	import LandingNav from '$lib/components/landing/LandingNav.svelte';
	import LandingFooter from '$lib/components/landing/LandingFooter.svelte';
	import type { Lang } from '$lib/i18n/landing.js';
	import { reveal } from '$lib/motion.js';
	import { animate, scroll, type DOMKeyframesDefinition } from 'motion';
	import communityBadge from '$lib/brand/badges/community.svg?raw';
	import swissBadge from '$lib/brand/badges/swiss.svg?raw';
	import Github from 'lucide-svelte/icons/git-fork';
	import ArrowRight from 'lucide-svelte/icons/arrow-right';

	let lang = $state<Lang>('de');

	const GITHUB_URL = 'https://github.com/michelutke/volleyball-scoreboard';

	const IMAGES = {
		vision: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=2000&q=70',
		mission: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=2000&q=70',
		values: 'https://images.unsplash.com/photo-1599058917765-a780eda07a3e?auto=format&fit=crop&w=2000&q=70',
		oss: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=2000&q=70'
	};

	const content = {
		de: {
			overline: 'Über uns',
			title: 'Sport in motion.',
			lines: ['Ball is in.', 'Linie isch drin.'],
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
						title: 'Wir gewinnen zusammen oder gar nicht.',
						desc: 'Wir verbringen viel Zeit miteinander, und das soll sich gut anfühlen. Wir nehmen unsere Arbeit ernst, uns selbst eher nicht. Wer im Team denkt, stellt nicht die eigene Agenda in den Vordergrund, sondern fragt zuerst: Was bringt uns als Ganzes weiter?'
					},
					{
						title: 'Wir bauen mit euch. Nicht für euch.',
						desc: 'Unser Produkt entsteht im Dialog mit Vereinen und der Open-Source-Community. Wer Feedback gibt, prägt die Roadmap. Die freie Variante ist kein Kompromiss, sie ist unser Versprechen an den Vereinssport.'
					},
					{
						title: 'Lokal verwurzelt. Offiziell verbunden.',
						desc: 'Wir kennen den Schweizer Sport von innen. Wir nutzen die offiziellen API-Schnittstellen der Schweizer Ligen und sprechen die Sprache der Vereine, Schiedsrichter und Verbände.'
					},
					{
						title: 'Mit Herz und Verstand.',
						desc: 'Zweimal messen, einmal schneiden, ob wir ein Feature bauen oder eine Partnerschaft eingehen. Leidenschaft und Tempo treiben uns an, und wir nehmen uns die Zeit, Optionen wirklich durchzudenken. Dann erst entscheiden und liefern wir.'
					},
					{
						title: 'Eines richtig. Dann das Nächste.',
						desc: 'Wir lösen ein Problem erst richtig, bevor wir das Nächste angehen. Wir starten mit dem perfekten Flow für Volleyball und skalieren von dort Schritt für Schritt auf weitere Schweizer Sportarten. Kein Feature-Sprung ohne solides Fundament.'
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
			lines: ['Ball is in.', 'Linie isch drin.'],
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
						title: 'We win together or not at all.',
						desc: 'We spend a lot of time together, and it should feel good. We take our work seriously. Ourselves, less so. Anyone thinking as a team puts the collective first and asks: what moves us forward as a whole?'
					},
					{
						title: 'We build with you. Not for you.',
						desc: 'Our product takes shape in dialogue with clubs and the open-source community. Whoever gives feedback shapes the roadmap. The free version is not a compromise, it is our promise to club sport.'
					},
					{
						title: 'Locally rooted. Officially connected.',
						desc: 'We know Swiss sport from the inside. We use the official API interfaces of the Swiss leagues and speak the language of clubs, referees and federations.'
					},
					{
						title: 'With heart and mind.',
						desc: 'Measure twice, cut once, whether we ship a feature or sign a partnership. Passion and speed drive us, and we still take the time to think options through. Only then do we decide and deliver.'
					},
					{
						title: 'One thing right. Then the next.',
						desc: 'We solve one problem properly before tackling the next. We start with the perfect flow for volleyball and scale from there to more Swiss sports, step by step. No feature jump without a solid foundation.'
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

	/** Scroll-linked background parallax; answers scroll only and renders static at motion scale 0. */
	function parallax(root: HTMLElement) {
		const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--motion-scale'));
		const img = root.querySelector<HTMLElement>('.bg-img');
		if (!img || !Number.isFinite(scale) || scale === 0) return;
		const stop = scroll(
			animate(
				img,
				{ transform: ['translateY(-30%) scale(1.15)', 'translateY(30%) scale(1.15)'] } as DOMKeyframesDefinition,
				{ duration: 1, ease: 'linear' }
			),
			{ target: root, offset: ['start end', 'end start'] }
		);
		return { destroy: () => stop?.() };
	}
</script>

{#snippet backdrop(src: string)}
	<div class="bg" aria-hidden="true">
		<img {src} alt="" class="bg-img" loading="lazy" />
	</div>
{/snippet}

<LandingNav {lang} onLangToggle={() => (lang = lang === 'de' ? 'en' : 'de')} basePath="/" />

<main class="page">
	<header class="hero">
		<div class="hero-inner">
			<p class="overline k-mono">{tr.overline}</p>
			<h1 class="title k-display" use:reveal={{ y: 16 }}>{tr.title}</h1>
			<p class="lines">
				{#each tr.lines as line, i}
					<span class="line">{line}</span>{#if i < tr.lines.length - 1}<span class="sep" aria-hidden="true"></span>{/if}
				{/each}
			</p>
		</div>
	</header>

	<section class="block">
		<div class="split">
			<div class="cell photo" use:parallax>
				{@render backdrop(IMAGES.vision)}
				<h2 class="block-title k-display">{tr.vision.heading}</h2>
				<p class="block-text">{tr.vision.text}</p>
			</div>
			<div class="cell photo" use:parallax>
				{@render backdrop(IMAGES.mission)}
				<h2 class="block-title k-display">{tr.mission.heading}</h2>
				<p class="block-text">{tr.mission.text}</p>
			</div>
		</div>
	</section>

	<section class="block photo" use:parallax>
		{@render backdrop(IMAGES.values)}
		<div class="block-inner">
			<h2 class="block-title k-display">{tr.values.heading}</h2>
			<p class="block-text">{tr.values.lead}</p>

			<ol class="value-list">
				{#each tr.values.items as value, i}
					<li class="value-row" use:reveal={{ y: 16, delay: i * 0.04 }}>
						<span class="row-num k-mono">{String(i + 1).padStart(2, '0')}</span>
						<div class="row-body">
							<h3 class="row-title">{value.title}</h3>
							<p class="row-desc">{value.desc}</p>
						</div>
					</li>
				{/each}
			</ol>
		</div>
	</section>

	<section class="block closer">
		<div class="split">
			<div class="cell photo" use:parallax>
				{@render backdrop(IMAGES.oss)}
				<h2 class="block-title k-display">{tr.oss.heading}</h2>
				<p class="block-text">{tr.oss.text}</p>
				<a class="cta" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
					<Github size="18" strokeWidth="2" />
					<span>{tr.oss.cta}</span>
					<ArrowRight size="16" strokeWidth="2" />
				</a>
			</div>
			<div class="plate">
				<div class="badge">{@html communityBadge}</div>
				<div class="badge">{@html swissBadge}</div>
			</div>
		</div>
	</section>
</main>

<LandingFooter {lang} />

<style>
	/* Photo backdrops: darkened so paper type stays readable in both themes */
	.photo {
		position: relative;
		isolation: isolate;
		overflow: hidden;
		color: var(--paper);
		--k-text: var(--paper);
		--k-text-mute: var(--grey-300);
		--k-text-dim: var(--grey-300);
		--k-line: color-mix(in srgb, var(--paper) 20%, transparent);
	}
	.bg {
		position: absolute;
		inset: -40% 0;
		z-index: -1;
		overflow: hidden;
	}
	.bg-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		filter: brightness(0.32) saturate(1.05) contrast(1.05);
		will-change: transform;
		transform: scale(1.15);
	}
	.bg::after {
		content: '';
		position: absolute;
		inset: 0;
		background: color-mix(in srgb, var(--ink) 35%, transparent);
	}
	:global([data-motion='static']) .bg-img {
		transform: none !important;
	}

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
		gap: 24px;
	}

	.overline {
		font-size: 13px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--k-text-dim);
		margin: 0;
	}

	.title {
		font-size: clamp(49px, 9vw, 120px);
		line-height: 0.95;
		letter-spacing: -0.035em;
		margin: 0;
	}

	.lines {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 20px;
		margin: 16px 0 0;
		padding-top: 24px;
		border-top: 1px solid var(--k-line);
		font-family: var(--font-display);
		font-weight: var(--type-wght-display);
		font-size: 25px;
		color: var(--k-text);
	}
	.sep {
		width: 1px;
		height: 24px;
		background: var(--k-line);
	}

	.block {
		padding: 120px var(--grid-margin);
		border-bottom: 1px solid var(--k-line);
	}

	.split {
		max-width: var(--container-max);
		margin: 0 auto;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0;
	}
	.split > .cell {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding-right: 48px;
	}
	.split > .cell + .cell {
		padding: 0 0 0 48px;
		border-left: 1px solid var(--k-line);
	}
	.split > .cell.photo,
	.split > .cell.photo + .cell {
		padding: 56px 48px;
		border-left: none;
		min-height: 360px;
		justify-content: flex-end;
	}

	.block-inner {
		max-width: 800px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.block-title {
		font-size: clamp(31px, 5vw, 49px);
		line-height: 1;
		letter-spacing: -0.025em;
		margin: 0;
	}
	.block-text {
		font-size: 16px;
		line-height: 1.6;
		color: var(--k-text-mute);
		margin: 0;
		max-width: 60ch;
	}

	.value-list {
		list-style: none;
		padding: 0;
		margin: 32px 0 0;
		display: flex;
		flex-direction: column;
		border-top: 1px solid var(--k-line);
	}

	.value-row {
		display: grid;
		grid-template-columns: 56px 1fr;
		gap: 24px;
		padding: 28px 0;
		border-bottom: 1px solid var(--k-line);
	}

	.row-num {
		font-size: 13px;
		letter-spacing: 0.12em;
		color: var(--k-text-dim);
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
		font-size: 20px;
		margin: 0;
		letter-spacing: -0.01em;
	}

	.row-desc {
		font-size: 16px;
		line-height: 1.6;
		color: var(--k-text-mute);
		margin: 0;
		max-width: 64ch;
	}

	.plate {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 32px;
		padding: 48px;
		background: var(--paper);
		margin-left: 48px;
	}
	.badge {
		width: min(100%, 200px);
		min-width: 96px;
		flex: 1 1 0;
	}
	.badge :global(svg) {
		display: block;
		width: 100%;
		height: auto;
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
		font-weight: var(--type-wght-medium);
		font-size: 16px;
		border-radius: 999px;
		transition: background var(--dur-fast) var(--ease-snap);
	}
	.cta:hover {
		background: var(--pulse-soft);
	}
	.cta:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 3px;
	}

	@media (max-width: 800px) {
		.block {
			padding: 72px var(--grid-margin);
		}
		.split {
			grid-template-columns: 1fr;
			gap: 48px;
		}
		.split > .cell,
		.split > .cell + .cell {
			padding: 0;
			border-left: none;
		}
		.split > .cell + .cell {
			padding-top: 48px;
			border-top: 1px solid var(--k-line);
		}
		.split > .cell.photo,
		.split > .cell.photo + .cell {
			padding: 40px 24px;
			border-top: none;
			min-height: 280px;
		}
		.split:has(.photo) {
			gap: 0;
		}
		.plate {
			margin-left: 0;
			padding: 32px 24px;
			gap: 16px;
		}
	}
</style>
