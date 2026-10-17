/**
 * Custom overlay sandbox. Custom overlay code is arbitrary HTML and JavaScript written by a
 * club (it receives match state via postMessage), so it is never sanitised. Instead every
 * response carries a CSP with `sandbox allow-scripts`: the document gets an opaque origin,
 * also when its URL is opened directly, so the code cannot read cookies, call the app's APIs
 * or touch the scorely.ch origin. `connect-src 'none'` additionally blocks network calls.
 */

export const SANDBOX_CSP =
	"sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com; img-src data: blob: https:; connect-src 'none'; font-src data: https://fonts.gstatic.com;";

export const MAX_CUSTOM_CODE_BYTES = 200_000;

export const MOCK_MATCH_STATE = {
	type: 'matchState',
	data: {
		homeTeam: 'VBC Thun',
		guestTeam: 'Volley Lugano',
		homePoints: 14,
		guestPoints: 10,
		homeSets: 1,
		guestSets: 0,
		currentSet: 2,
		setScores: [{ home: 25, guest: 21 }],
		serviceTeam: 'home',
		status: 'live',
		homeJerseyColor: '#c0392b',
		guestJerseyColor: '#1e6ab5',
		homeTeamLogo: null,
		guestTeamLogo: null,
		timeout: { active: false, team: null },
		isSetPoint: false,
		isMatchPoint: false
	}
} as const;

export const OVERLAY_COLOR_KEYS = [
	'overlayBg',
	'overlayBg2',
	'overlayText',
	'overlayDivider',
	'overlaySatsBg',
	'overlaySetScoreBg',
	'scoreColor',
	'scoreColor2'
] as const;

export type OverlayColors = Partial<Record<(typeof OVERLAY_COLOR_KEYS)[number], string | null>>;

const CSS_VAR_NAMES: Record<(typeof OVERLAY_COLOR_KEYS)[number], string> = {
	overlayBg: '--overlay-bg',
	overlayBg2: '--overlay-bg2',
	overlayText: '--overlay-text',
	overlayDivider: '--overlay-divider',
	overlaySatsBg: '--overlay-sats-bg',
	overlaySetScoreBg: '--overlay-set-score-bg',
	scoreColor: '--score-color',
	scoreColor2: '--score-color2'
};

/** Colour values only (hex, rgb(), named); anything else is dropped so it cannot end the style block. */
function safeColor(value: string | null | undefined): string | null {
	if (!value) return null;
	return /^[#a-zA-Z0-9(),.%\s-]{1,64}$/.test(value) ? value : null;
}

export function buildCssVars(colors: OverlayColors): string {
	const lines = OVERLAY_COLOR_KEYS.flatMap((key) => {
		const value = safeColor(colors[key]);
		return value ? [`${CSS_VAR_NAMES[key]}: ${value};`] : [];
	});
	return `:root { ${lines.join(' ')} }`;
}

/** Full sandbox document. `preview` dispatches mock match state so the overlay renders without a live match. */
export function buildSandboxHtml(code: string, colors: OverlayColors, preview: boolean): string {
	const previewScript = preview
		? `<script>setTimeout(()=>window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(MOCK_MATCH_STATE)}})),300)</script>`
		: '';
	return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${buildCssVars(colors)} body{margin:0;background:transparent;}</style>${previewScript}</head><body>${code}</body></html>`;
}

export function sandboxResponse(html: string): Response {
	return new Response(html, {
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'Content-Security-Policy': SANDBOX_CSP,
			'X-Frame-Options': 'SAMEORIGIN',
			'Cache-Control': 'no-store'
		}
	});
}
