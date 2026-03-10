<script lang="ts">
	import LandingNav from '$lib/components/landing/LandingNav.svelte';
	import LandingFooter from '$lib/components/landing/LandingFooter.svelte';
	import type { Lang } from '$lib/i18n/landing.js';

	let lang = $state<Lang>('de');

	interface LicenseEntry {
		licenses: string;
		repository?: string;
		publisher?: string;
		url?: string;
	}

	let licenses = $state<Record<string, LicenseEntry>>({});
	let licensesOpen = $state(false);

	async function loadLicenses() {
		if (Object.keys(licenses).length > 0) return;
		try {
			const res = await fetch('/licenses.json');
			if (res.ok) licenses = await res.json();
		} catch {
			// licenses.json not available
		}
	}

	function toggleLicenses() {
		licensesOpen = !licensesOpen;
		if (licensesOpen) loadLicenses();
	}
</script>

<LandingNav {lang} onLangToggle={() => { lang = lang === 'de' ? 'en' : 'de'; }} basePath="/" />

<main class="mx-auto max-w-3xl px-4 py-24 md:px-8">
	<h1 class="mb-2 text-3xl font-bold text-[var(--color-text-primary)]">Impressum</h1>
	<p class="mb-10 text-sm text-[var(--color-text-tertiary)]">Stand: März 2026</p>

	<div class="space-y-10 text-[var(--color-text-secondary)] leading-relaxed">

		<section>
			<h2 class="mb-3 text-xl font-semibold text-[var(--color-text-primary)]">Angaben gemäss Art. 3 lit. s UWG</h2>
			<address class="not-italic space-y-1">
				<p class="font-medium text-[var(--color-text-primary)]">Michel Utke</p>
				<p>
					E-Mail:
					<a href="mailto:contact@scorely.ch" class="underline hover:text-[var(--color-accent-mid)]">
						contact@scorely.ch
					</a>
				</p>
			</address>
		</section>

		<section>
			<h2 class="mb-3 text-xl font-semibold text-[var(--color-text-primary)]">Swiss Volley Manager API</h2>
			<p>
				Scorely nutzt die öffentlich dokumentierte
				<a
					href="https://swissvolley.docs.apiary.io/"
					target="_blank"
					rel="noopener noreferrer"
					class="underline hover:text-[var(--color-accent-mid)]"
				>
					Swiss Volley Manager API
				</a>
				für den optionalen Import von Spielplänen und Teamdaten.
				Dieses Produkt wird nicht von Swiss Volley betrieben und ist kein offizieller
				Swiss-Volley-Partner.
			</p>
		</section>

		<section>
			<h2 class="mb-3 text-xl font-semibold text-[var(--color-text-primary)]">Open Source</h2>
			<p>
				Scorely ist ein Open-Source-Projekt und steht auf GitHub zur freien Verfügung.
				Der Quellcode ist unter der MIT-Lizenz veröffentlicht.
			</p>
			<a
				href="https://github.com/michelutke/volleyball-scoreboard"
				target="_blank"
				rel="noopener noreferrer"
				class="mt-3 inline-block rounded-lg border border-[var(--color-border-subtle)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent-mid)] hover:text-[var(--color-accent-mid)]"
			>
				github.com/michelutke/volleyball-scoreboard →
			</a>
		</section>

		<section>
			<h2 class="mb-3 text-xl font-semibold text-[var(--color-text-primary)]">Verwendete Open-Source-Bibliotheken</h2>
			<p class="mb-4">
				Scorely baut auf folgenden quelloffenen Bibliotheken auf. Alle Lizenzen sind vollständig eingehalten.
			</p>

			<button
				onclick={toggleLicenses}
				class="flex items-center gap-2 rounded-lg border border-[var(--color-border-subtle)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent-mid)] hover:text-[var(--color-accent-mid)]"
			>
				{licensesOpen ? '▾' : '▸'}
				Lizenzen anzeigen
			</button>

			{#if licensesOpen}
				<div class="mt-4 overflow-hidden rounded-xl border border-[var(--color-border-subtle)]">
					{#if Object.keys(licenses).length === 0}
						<p class="p-4 text-sm text-[var(--color-text-tertiary)]">Lizenzdaten werden geladen…</p>
					{:else}
						<table class="w-full text-sm">
							<thead>
								<tr class="border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)]">
									<th class="px-4 py-2 text-left font-medium text-[var(--color-text-primary)]">Paket</th>
									<th class="px-4 py-2 text-left font-medium text-[var(--color-text-primary)]">Lizenz</th>
								</tr>
							</thead>
							<tbody>
								{#each Object.entries(licenses) as [pkg, info]}
									<tr class="border-b border-[var(--color-border-subtle)] last:border-0 hover:bg-[var(--color-bg-elevated)]">
										<td class="px-4 py-2 font-mono text-xs text-[var(--color-text-secondary)]">
											{#if info.repository}
												<a
													href={info.repository}
													target="_blank"
													rel="noopener noreferrer"
													class="underline hover:text-[var(--color-accent-mid)]"
												>{pkg}</a>
											{:else}
												{pkg}
											{/if}
										</td>
										<td class="px-4 py-2 text-xs text-[var(--color-text-tertiary)]">{info.licenses}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					{/if}
				</div>
			{/if}
		</section>

		<section>
			<h2 class="mb-3 text-xl font-semibold text-[var(--color-text-primary)]">Haftungsausschluss</h2>
			<p>
				Die Inhalte dieser Website wurden sorgfältig erstellt. Für die Richtigkeit, Vollständigkeit
				und Aktualität der Inhalte wird jedoch keine Gewähr übernommen. Für externe Verlinkungen
				übernehmen wir keine Haftung.
			</p>
		</section>

	</div>
</main>

<LandingFooter {lang} />
