<script lang="ts">
	import type { Lang } from '$lib/i18n/landing.js';
	import { reveal } from '$lib/motion.js';

	interface Props {
		lang: Lang;
	}

	let { lang }: Props = $props();

	const translations = {
		de: {
			overline: '— Häufige Fragen',
			title: 'FAQ.',
			items: [
				{
					q: 'Brauche ich spezielle Hardware?',
					a: 'Nein. Scorely läuft komplett im Browser. Du brauchst nur einen Computer und eine Internetverbindung.',
					link: null
				},
				{
					q: 'Wie funktioniert der Swiss Volley Import?',
					a: 'Scorely nutzt die Swiss Volley Manager API, um Spielpläne, Teams und Spielorte automatisch zu importieren. Scorely wird nicht von Swiss Volley betrieben und steht in keiner offiziellen Verbindung zu Swiss Volley.',
					link: { text: 'Swiss Volley Manager API', url: 'https://swissvolley.docs.apiary.io/' }
				},
				{
					q: 'Was passiert nach der Testphase?',
					a: 'Nach 3 Tagen kannst du ein Abo abschliessen oder dein Konto löschen. Keine versteckten Kosten.',
					link: null
				},
				{
					q: 'Funktioniert Scorely mit meiner Streaming-Software?',
					a: 'Ja. Das Overlay funktioniert als Browser Source in OBS, Streamlabs, vMix und anderen Programmen.',
					link: null
				},
				{
					q: 'Wie viele Scorer kann ich einladen?',
					a: 'Mit dem aktuellen Plan kannst du bis zu 5 Scorer einladen.',
					link: null
				}
			]
		},
		en: {
			overline: '— FAQ',
			title: 'Questions.',
			items: [
				{
					q: 'Do I need special hardware?',
					a: 'No. Scorely runs entirely in the browser. All you need is a computer and an internet connection.',
					link: null
				},
				{
					q: 'How does the Swiss Volley import work?',
					a: 'Scorely uses the Swiss Volley Manager API to automatically import schedules, teams and venues. Scorely is not operated by Swiss Volley and has no official affiliation with Swiss Volley.',
					link: { text: 'Swiss Volley Manager API', url: 'https://swissvolley.docs.apiary.io/' }
				},
				{
					q: 'What happens after the trial?',
					a: 'After 3 days you can start a subscription or delete your account. No hidden costs.',
					link: null
				},
				{
					q: 'Does Scorely work with my streaming software?',
					a: 'Yes. The overlay works as a browser source in OBS, Streamlabs, vMix and other programs.',
					link: null
				},
				{
					q: 'How many scorers can I invite?',
					a: 'With the current plan you can invite up to 5 scorers.',
					link: null
				}
			]
		}
	} as const;

	const tr = $derived(translations[lang]);

	let openIndex = $state<number | null>(null);

	function toggle(i: number) {
		openIndex = openIndex === i ? null : i;
	}
</script>

<section id="faq" class="faq">
	<div class="inner">
		<header class="head">
			<p class="overline k-mono">{tr.overline}</p>
			<h2 class="title k-display" use:reveal={{ y: 32 }}>{tr.title}</h2>
		</header>

		<div class="list">
			{#each tr.items as item, i}
				<div class="row" class:open={openIndex === i} use:reveal={{ y: 18, delay: i * 0.04 }}>
					<button class="trigger" onclick={() => toggle(i)} aria-expanded={openIndex === i}>
						<span class="num k-mono">0{i + 1}</span>
						<span class="q">{item.q}</span>
						<span class="chev" aria-hidden="true">
							<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path d="M6 9l6 6 6-6" stroke-linecap="round" />
							</svg>
						</span>
					</button>
					<div class="answer-wrap">
						<div class="answer">
							<p>
								{item.a}
								{#if item.link}
									<a href={item.link.url} target="_blank" rel="noopener noreferrer" class="ext">
										{item.link.text} →
									</a>
								{/if}
							</p>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.faq {
		background: var(--k-surface);
		color: var(--k-text);
		padding: 140px var(--grid-margin);
	}

	.inner {
		max-width: 960px;
		margin: 0 auto;
	}

	.head {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-bottom: 64px;
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

	.list {
		display: flex;
		flex-direction: column;
		border-top: 1px solid var(--k-line);
	}

	.row {
		border-bottom: 1px solid var(--k-line);
	}

	.trigger {
		width: 100%;
		display: grid;
		grid-template-columns: 56px 1fr 32px;
		gap: 16px;
		align-items: center;
		background: transparent;
		border: none;
		padding: 24px 0;
		cursor: pointer;
		text-align: left;
		color: var(--k-text);
		transition: color var(--dur-fast) var(--ease-snap);
	}
	.trigger:hover {
		color: var(--pulse);
	}

	.num {
		font-size: 12px;
		letter-spacing: 0.1em;
		color: var(--k-text-dim);
	}

	.q {
		font-family: var(--font-display);
		font-weight: var(--type-wght-medium);
		font-size: clamp(18px, 2vw, 22px);
		letter-spacing: -0.01em;
	}

	.chev {
		display: inline-flex;
		justify-self: end;
		color: var(--k-text-mute);
		transition: transform var(--dur-mid) var(--ease-mass),
			color var(--dur-fast) var(--ease-snap);
	}
	.row.open .chev {
		transform: rotate(180deg);
		color: var(--pulse);
	}

	.answer-wrap {
		display: grid;
		grid-template-rows: 0fr;
		transition: grid-template-rows var(--dur-mid) var(--ease-mass);
	}
	.row.open .answer-wrap {
		grid-template-rows: 1fr;
	}

	.answer {
		overflow: hidden;
		min-height: 0;
	}
	.answer p {
		padding: 0 0 24px 72px;
		margin: 0;
		font-size: 15px;
		line-height: 1.65;
		color: var(--k-text-mute);
		max-width: 720px;
	}

	.ext {
		color: var(--cool-soft);
		text-decoration: none;
		border-bottom: 1px solid currentColor;
	}
	.ext:hover {
		color: var(--cool);
	}

	@media (max-width: 640px) {
		.trigger {
			grid-template-columns: 36px 1fr 24px;
			gap: 12px;
		}
		.answer p {
			padding-left: 48px;
		}
	}
</style>
