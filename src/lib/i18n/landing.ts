export type Lang = 'de' | 'en';

export const t = {
	de: {
		nav: {
			features: 'Funktionen',
			pricing: 'Preise',
			about: 'Über uns',
			signin: 'Anmelden',
			cta: 'Kostenlos testen →'
		},
		hero: {
			headline: 'Volleyball-Scoring.\nLive. Professionell.',
			sub: 'Dein Verein verdient mehr als Papier und Bleistift. Scorely bringt Echtzeit-Scoring direkt in deinen Stream · kein Setup, keine Hardware, keine Fehler.',
			ctaPrimary: '3 Tage kostenlos testen',
			ctaSecondary: 'Demo ausprobieren ↓',
			socialProof: 'Von VBC Thun eingesetzt · 50+ Matches live übertragen'
		},
		demo: {
			title: 'Probier Scorely aus',
			subtitle:
				'Klick auf + um zu scoren. Sieh wie das OBS-Overlay in Echtzeit reagiert · mit Match Point, Auszeiten und Satzresultaten.',
			svBadge: 'Importiert von Swiss Volley · NLA · Spiez Arena · 1. März 2026',
			obsLabel: 'OBS Studio · Browser Source',
			timeout: 'Auszeit',
			set: 'Satz',
			sets: 'Sätze',
			matchWon: 'gewinnt das Match!',
			reset: 'Neu starten'
		},
		features: {
			title: 'Alles was du brauchst',
			items: [
				{
					icon: 'radio',
					title: 'OBS Browser Source',
					desc: 'Transparentes Overlay, direkt als Browser Source in OBS Studio, Streamlabs oder vMix. Keine Installation.'
				},
				{
					icon: 'bell-ring',
					title: 'Automatische Banner',
					desc: 'Set Point (blau), Match Point (rot) und Auszeit (gelb) erscheinen und verschwinden automatisch.'
				},
				{
					icon: 'timer',
					title: 'Auszeit-Management',
					desc: '2 Auszeiten pro Team, pro Satz. Timer läuft 30 Sekunden · Banner verschwindet automatisch.'
				},
				{
					icon: 'database',
					title: 'Swiss Volley Import',
					desc: 'Spielpläne, Teams und Spielorte mit einem Klick aus der Swiss Volley Datenbank importieren.'
				}
			]
		},
		howItWorks: {
			title: 'In 3 Schritten live',
			steps: [
				{
					num: '1',
					title: 'Konto erstellen',
					desc: 'Verein anlegen, 3 Tage gratis testen · keine Kreditkarte erforderlich.'
				},
				{
					num: '2',
					title: 'Match starten',
					desc: 'Spielpläne importieren oder manuell erstellen, Scoring-Panel öffnen.'
				},
				{
					num: '3',
					title: 'Live gehen',
					desc: 'OBS Browser Source hinzufügen · Overlay läuft sofort.'
				}
			]
		}
	},
	en: {
		nav: {
			features: 'Features',
			pricing: 'Pricing',
			about: 'About',
			signin: 'Sign in',
			cta: 'Try for free →'
		},
		hero: {
			headline: 'Volleyball Scoring.\nLive. Professional.',
			sub: 'Your club deserves better than pen and paper. Scorely brings real-time scoring straight into your stream · no setup, no hardware, no mistakes.',
			ctaPrimary: 'Try free for 3 days',
			ctaSecondary: 'Try the demo ↓',
			socialProof: 'Used by VBC Thun · 50+ matches live streamed'
		},
		demo: {
			title: 'Try Scorely now',
			subtitle:
				'Click + to score a point. See how the OBS overlay reacts in real time · with match point, timeouts and set scores.',
			svBadge: 'Imported from Swiss Volley · NLA · Spiez Arena · 1 March 2026',
			obsLabel: 'OBS Studio · Browser Source',
			timeout: 'Timeout',
			set: 'Set',
			sets: 'Sets',
			matchWon: 'wins the match!',
			reset: 'Reset'
		},
		features: {
			title: 'Everything you need',
			items: [
				{
					icon: 'radio',
					title: 'OBS Browser Source',
					desc: 'Transparent overlay, directly as browser source in OBS Studio, Streamlabs or vMix. No installation.'
				},
				{
					icon: 'bell-ring',
					title: 'Automatic Banners',
					desc: 'Set point (blue), match point (red) and timeout (yellow) appear and disappear automatically.'
				},
				{
					icon: 'timer',
					title: 'Timeout Management',
					desc: '2 timeouts per team per set. 30-second timer runs · banner disappears automatically.'
				},
				{
					icon: 'database',
					title: 'Swiss Volley Import',
					desc: 'Import schedules, teams and venues with one click from the Swiss Volley database.'
				}
			]
		},
		howItWorks: {
			title: '3 steps to go live',
			steps: [
				{
					num: '1',
					title: 'Create account',
					desc: 'Set up your club, try free for 3 days · no credit card required.'
				},
				{
					num: '2',
					title: 'Start a match',
					desc: 'Import schedules or create manually, open the scoring panel.'
				},
				{
					num: '3',
					title: 'Go live',
					desc: 'Add OBS browser source · overlay works instantly.'
				}
			]
		}
	}
} as const;
