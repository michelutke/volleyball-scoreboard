<script lang="ts">
	import LandingNav from '$lib/components/landing/LandingNav.svelte';
	import LandingFooter from '$lib/components/landing/LandingFooter.svelte';
	import type { Lang } from '$lib/i18n/landing.js';

	let lang = $state<Lang>('de');

	const GITHUB_URL = 'https://github.com/michelutke/volleyball-scoreboard';

	const content = {
		de: {
			title: 'Über uns',
			vision: {
				heading: 'Vision',
				text: 'Jeder Schweizer Sportverein, unabhängig von Budget oder IT-Kenntnissen, begeistert seine Fans mit professionellen Livestreams im Broadcast Look.'
			},
			mission: {
				heading: 'Mission',
				text: 'Wir glauben, dass lokaler Schweizer Sport die gleiche professionelle Bühne verdient wie die grossen Ligen — und zwar ohne, dass ehrenamtliche Helfer*innen dafür IT-Experten sein müssen. Mit unseren intuitiven Open-Source- und SaaS-Lösungen machen wir hochwertige Scoring Overlays zugänglich und einfach bedienbar.'
			},
			values: {
				heading: 'Kernwerte',
				items: [
					{
						icon: '⚡',
						title: 'Radikale Einfachheit',
						desc: 'Ehrenamtliche arbeiten oft unter Stress. Unsere Overlays sind Plug & Play und intuitiv bedienbar — ganz ohne IT-Background.'
					},
					{
						icon: '🌐',
						title: 'Volles Community-Commitment',
						desc: 'Wir entwickeln direkt mit dem Feedback der Vereine und der Open-Source-Community. Die freie Variante bleibt unser festes Fundament.'
					},
					{
						icon: '🇨🇭',
						title: 'Swiss Leagues First',
						desc: 'Wir kennen den lokalen Sport und nutzen die offiziellen API-Schnittstellen für Schweizer Ligen.'
					},
					{
						icon: '🎨',
						title: 'Visual Excellence',
						desc: 'Ein kleines Budget bedeutet bei uns nicht kleine Qualität. Wir bringen modernen Broadcast Look in jede Turnhalle.'
					},
					{
						icon: '🎯',
						title: 'Meisterschaft durch Fokus',
						desc: 'Wir lösen ein Problem erst richtig, bevor wir das nächste angehen. Start mit Volleyball, dann Schritt für Schritt weitere Sportarten.'
					}
				]
			},
			oss: {
				heading: 'Open Source',
				text: 'Scorely ist quelloffen und steht jedem frei zur Verfügung. Wir glauben an den Wert offener Software für die Gemeinschaft. Contributions sind herzlich willkommen.',
				cta: 'Auf GitHub ansehen →'
			}
		},
		en: {
			title: 'About',
			vision: {
				heading: 'Vision',
				text: 'Every Swiss sports club, regardless of budget or IT knowledge, thrills its fans with professional-looking livestreams.'
			},
			mission: {
				heading: 'Mission',
				text: 'We believe local Swiss sport deserves the same professional stage as the big leagues — without volunteers needing to be IT experts. With our intuitive open-source and SaaS solutions, we make high-quality scoring overlays accessible and easy to use.'
			},
			values: {
				heading: 'Core Values',
				items: [
					{
						icon: '⚡',
						title: 'Radical Simplicity',
						desc: 'Volunteers work under stress. Our overlays are plug & play and intuitive — no IT background needed.'
					},
					{
						icon: '🌐',
						title: 'Full Community Commitment',
						desc: 'We build directly with feedback from clubs and the open-source community. The free version remains our firm foundation.'
					},
					{
						icon: '🇨🇭',
						title: 'Swiss Leagues First',
						desc: 'We know local sport and use the official API interfaces for Swiss leagues.'
					},
					{
						icon: '🎨',
						title: 'Visual Excellence',
						desc: 'A small budget doesn\'t mean small quality. We bring modern broadcast look to every sports hall.'
					},
					{
						icon: '🎯',
						title: 'Mastery through Focus',
						desc: 'We solve one problem properly before moving to the next. Starting with volleyball, then expanding step by step.'
					}
				]
			},
			oss: {
				heading: 'Open Source',
				text: 'Scorely is open source and freely available to everyone. We believe in the value of open software for the community. Contributions are very welcome.',
				cta: 'View on GitHub →'
			}
		}
	} as const;

	const tr = $derived(content[lang]);
</script>

<LandingNav {lang} onLangToggle={() => { lang = lang === 'de' ? 'en' : 'de'; }} basePath="/" />

<main>
	<!-- Hero -->
	<div class="px-4 pt-32 pb-16 text-center md:px-8" style="background: var(--color-bg-base);">
		<h1
			class="text-4xl font-extrabold text-[var(--color-text-primary)] md:text-5xl"
			style="font-family: 'Montserrat', sans-serif;"
		>
			{tr.title}
		</h1>
	</div>

	<div class="mx-auto max-w-3xl space-y-16 px-4 pb-24 md:px-8">

		<!-- Vision -->
		<section class="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-panel-alt)] p-8">
			<h2 class="mb-4 text-2xl font-bold text-[var(--color-accent-mid)]">{tr.vision.heading}</h2>
			<p class="text-lg leading-relaxed text-[var(--color-text-primary)]">{tr.vision.text}</p>
		</section>

		<!-- Mission -->
		<section>
			<h2 class="mb-4 text-2xl font-bold text-[var(--color-text-primary)]">{tr.mission.heading}</h2>
			<p class="text-base leading-relaxed text-[var(--color-text-secondary)]">{tr.mission.text}</p>
		</section>

		<!-- Core Values -->
		<section>
			<h2 class="mb-8 text-2xl font-bold text-[var(--color-text-primary)]">{tr.values.heading}</h2>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				{#each tr.values.items as value}
					<div class="flex gap-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-panel-alt)] p-5">
						<span class="shrink-0 text-2xl">{value.icon}</span>
						<div>
							<p class="mb-1 font-semibold text-[var(--color-text-primary)]">{value.title}</p>
							<p class="text-sm leading-relaxed text-[var(--color-text-secondary)]">{value.desc}</p>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<!-- Open Source -->
		<section class="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-panel-alt)] p-8 text-center">
			<h2 class="mb-4 text-2xl font-bold text-[var(--color-text-primary)]">{tr.oss.heading}</h2>
			<p class="mb-6 text-base leading-relaxed text-[var(--color-text-secondary)]">{tr.oss.text}</p>
			<a
				href={GITHUB_URL}
				target="_blank"
				rel="noopener noreferrer"
				class="inline-block rounded-xl border border-[var(--color-border-subtle)] px-6 py-3 font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent-mid)] hover:text-[var(--color-accent-mid)]"
			>
				{tr.oss.cta}
			</a>
		</section>

	</div>
</main>

<LandingFooter {lang} />
