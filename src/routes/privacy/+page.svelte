<script lang="ts">
	import LandingNav from '$lib/components/landing/LandingNav.svelte';
	import LandingFooter from '$lib/components/landing/LandingFooter.svelte';
	import type { Lang } from '$lib/i18n/landing.js';

	let lang = $state<Lang>('de');
</script>

<LandingNav {lang} onLangToggle={() => { lang = lang === 'de' ? 'en' : 'de'; }} basePath="/" />

<main class="mx-auto max-w-3xl px-4 py-24 md:px-8">
	<h1 class="mb-2 text-3xl font-bold text-[var(--color-text-primary)]">Datenschutzerklärung</h1>
	<p class="mb-10 text-sm text-[var(--color-text-tertiary)]">Stand: März 2026</p>

	<div class="space-y-10 text-[var(--color-text-secondary)] leading-relaxed">

		<section>
			<h2 class="mb-3 text-xl font-semibold text-[var(--color-text-primary)]">1. Verantwortliche Stelle</h2>
			<p>
				Verantwortlich für die Verarbeitung personenbezogener Daten im Sinne des Schweizer Bundesgesetzes
				über den Datenschutz (nDSG) ist:
			</p>
			<address class="mt-3 not-italic">
				Michel Utke<br />
				E-Mail: <a href="mailto:contact@scorely.ch" class="underline hover:text-[var(--color-accent-mid)]">contact@scorely.ch</a>
			</address>
		</section>

		<section>
			<h2 class="mb-3 text-xl font-semibold text-[var(--color-text-primary)]">2. Erhobene Daten</h2>
			<p class="mb-3">Scorely erhebt nur Daten, die für den Betrieb des Dienstes notwendig sind:</p>

			<h3 class="mb-2 font-semibold text-[var(--color-text-primary)]">Registrierung & Konto</h3>
			<ul class="mb-4 list-disc pl-5 space-y-1">
				<li>E-Mail-Adresse, Vor- und Nachname</li>
				<li>Passwort (gespeichert als gehashter Wert durch Keycloak — Scorely hat keinen Zugriff auf das Klartextpasswort)</li>
				<li>Organisationszugehörigkeit und Rolle (z. B. Admin oder Scorer)</li>
			</ul>

			<h3 class="mb-2 font-semibold text-[var(--color-text-primary)]">Abonnement & Abrechnung</h3>
			<ul class="mb-4 list-disc pl-5 space-y-1">
				<li>Stripe-Kunden-ID und Abonnementstatus (z. B. aktiv, Testphase, gekündigt)</li>
				<li>Zahlungsdaten werden ausschliesslich von Stripe verarbeitet und niemals auf Scorely-Servern gespeichert</li>
			</ul>

			<h3 class="mb-2 font-semibold text-[var(--color-text-primary)]">Vereins- und Matchdaten</h3>
			<ul class="mb-4 list-disc pl-5 space-y-1">
				<li>Vereinsname, Teamnamen, Spielorte, Ligen</li>
				<li>Matchergebnisse, Satzstände, Auszeiten (durch Nutzer erfasst)</li>
				<li>Swiss Volley API-Schlüssel (verschlüsselt gespeichert, falls genutzt)</li>
				<li>Overlay-Einstellungen (Farben, Darstellungsoptionen)</li>
			</ul>

			<h3 class="mb-2 font-semibold text-[var(--color-text-primary)]">Keine Tracking-Daten</h3>
			<p>
				Scorely verwendet keine Analyse-Tools, keine Werbe-Cookies und kein Tracking Dritter.
				Auf öffentlichen Seiten (Landing Page, Overlay) werden keinerlei personenbezogenen Daten erhoben.
			</p>
		</section>

		<section>
			<h2 class="mb-3 text-xl font-semibold text-[var(--color-text-primary)]">3. Zweck der Verarbeitung</h2>
			<ul class="list-disc pl-5 space-y-1">
				<li>Bereitstellung und Betrieb des Scoreboard-Dienstes</li>
				<li>Benutzerkontenverwaltung und Authentifizierung</li>
				<li>Abonnementabwicklung und Rechnungsstellung</li>
				<li>Technischer Support per E-Mail</li>
			</ul>
		</section>

		<section>
			<h2 class="mb-3 text-xl font-semibold text-[var(--color-text-primary)]">4. Rechtsgrundlage</h2>
			<p>
				Die Datenverarbeitung erfolgt auf Grundlage der Vertragserfüllung (Art. 31 Abs. 2 lit. a nDSG)
				sowie des berechtigten Interesses an einem sicheren und reibungslosen Betrieb des Dienstes.
			</p>
		</section>

		<section>
			<h2 class="mb-3 text-xl font-semibold text-[var(--color-text-primary)]">5. Drittanbieter</h2>
			<p class="mb-3">Scorely nutzt folgende externe Dienste:</p>
			<ul class="list-disc pl-5 space-y-2">
				<li>
					<strong class="text-[var(--color-text-primary)]">Keycloak</strong> — Identitäts- und Zugangsverwaltung.
					Benutzerdaten (E-Mail, Name, Passwort) werden in Keycloak gespeichert und verwaltet.
				</li>
				<li>
					<strong class="text-[var(--color-text-primary)]">Stripe</strong> — Zahlungsabwicklung.
					Zahlungsdaten werden ausschliesslich von Stripe verarbeitet. Scorely speichert nur die
					Stripe-Kunden-ID und den Abonnementstatus.
				</li>
				<li>
					<strong class="text-[var(--color-text-primary)]">Swiss Volley Manager API</strong> — Optionaler Import
					von Spielplänen und Teamdaten. Nutzung nur mit expliziter Eingabe eines API-Schlüssels durch den Nutzer.
					Scorely wird nicht von Swiss Volley betrieben.
				</li>
			</ul>
		</section>

		<section>
			<h2 class="mb-3 text-xl font-semibold text-[var(--color-text-primary)]">6. Datenübermittlung ins Ausland</h2>
			<p>
				Die App-Server befinden sich in der EU (Deutschland). Stripe verarbeitet Zahlungsdaten in den USA.
				Stripe ist unter dem EU-U.S. Data Privacy Framework zertifiziert; es gelten Standardvertragsklauseln
				zum Schutz der übermittelten Daten.
			</p>
		</section>

		<section>
			<h2 class="mb-3 text-xl font-semibold text-[var(--color-text-primary)]">7. Speicherdauer</h2>
			<ul class="list-disc pl-5 space-y-1">
				<li>Kontodaten werden gespeichert, bis das Konto gelöscht wird</li>
				<li>Matchdaten werden gespeichert, bis das Konto gelöscht wird</li>
				<li>Stripe-Abrechnungsdaten verbleiben bei Stripe gemäss deren Datenschutzrichtlinien</li>
			</ul>
		</section>

		<section>
			<h2 class="mb-3 text-xl font-semibold text-[var(--color-text-primary)]">8. Benutzerrechte (nDSG)</h2>
			<p class="mb-3">Gemäss dem Schweizer Datenschutzgesetz stehen dir folgende Rechte zu:</p>
			<ul class="list-disc pl-5 space-y-1">
				<li>Recht auf Auskunft über gespeicherte Daten (Art. 25 nDSG)</li>
				<li>Recht auf Berichtigung unrichtiger Daten (Art. 32 nDSG)</li>
				<li>Recht auf Löschung deiner Daten (Art. 32 nDSG)</li>
				<li>Recht auf Einschränkung der Verarbeitung</li>
				<li>Recht auf Datenübertragbarkeit</li>
			</ul>
			<p class="mt-3">
				Zur Ausübung dieser Rechte wende dich an:
				<a href="mailto:contact@scorely.ch" class="underline hover:text-[var(--color-accent-mid)]">contact@scorely.ch</a>
			</p>
		</section>

		<section>
			<h2 class="mb-3 text-xl font-semibold text-[var(--color-text-primary)]">9. Kontakt & Beschwerden</h2>
			<p>
				Bei Fragen oder Beschwerden zur Datenverarbeitung kannst du dich jederzeit an
				<a href="mailto:contact@scorely.ch" class="underline hover:text-[var(--color-accent-mid)]">contact@scorely.ch</a>
				wenden. Du hast ausserdem das Recht, beim Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten
				(EDÖB) Beschwerde einzureichen.
			</p>
		</section>

	</div>
</main>

<LandingFooter {lang} />
