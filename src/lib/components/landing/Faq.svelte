<script lang="ts">
	import type { Lang } from '$lib/i18n/landing.js';

	interface Props {
		lang: Lang;
	}

	let { lang }: Props = $props();

	const translations = {
		de: {
			title: 'Häufige Fragen',
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
			title: 'FAQ',
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

<section id="faq" class="py-24 px-4">
	<div class="mx-auto max-w-2xl">
		<h2
			class="mb-12 text-center text-3xl font-bold text-[var(--color-text-primary)]"
			style="font-family: 'Montserrat', sans-serif;"
		>
			{tr.title}
		</h2>

		<div>
			{#each tr.items as item, i}
				<div class="border-b border-[var(--color-border-subtle)]">
					<button
						onclick={() => toggle(i)}
						class="flex w-full items-center justify-between py-5 text-left text-[var(--color-text-primary)] transition-colors hover:text-[var(--color-accent-mid)]"
					>
						<span class="font-medium">{item.q}</span>
						<span class="ml-4 shrink-0 text-lg text-[var(--color-text-secondary)]">
							{openIndex === i ? '▾' : '▸'}
						</span>
					</button>
					{#if openIndex === i}
						<p class="pb-5 text-[var(--color-text-secondary)] leading-relaxed">
							{item.a}
							{#if item.link}
								<a
									href={item.link.url}
									target="_blank"
									rel="noopener noreferrer"
									class="underline hover:text-[var(--color-accent-mid)]"
								>{item.link.text}</a>
							{/if}
						</p>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</section>
