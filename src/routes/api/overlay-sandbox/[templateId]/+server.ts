import { db } from '$lib/server/db/index.js';
import { designTemplates } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types.js';

const MOCK_STATE = JSON.stringify({
	type: 'matchState',
	data: {
		homeTeam: 'HEIM',
		guestTeam: 'GAST',
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
});

export const GET: RequestHandler = async ({ params, url }) => {
	const templateId = parseInt(params.templateId);
	if (isNaN(templateId)) return new Response('Not found', { status: 404 });

	const template = await db.query.designTemplates.findFirst({
		where: eq(designTemplates.id, templateId)
	});
	if (!template?.customCode) return new Response('Not found', { status: 404 });

	const isPreview = url.searchParams.has('preview');

	const cssVars = `
:root {
  --overlay-bg: ${template.overlayBg};
  --overlay-bg2: ${template.overlayBg2};
  --overlay-text: ${template.overlayText};
  --overlay-divider: ${template.overlayDivider};
  --overlay-sats-bg: ${template.overlaySatsBg};
  --overlay-set-score-bg: ${template.overlaySetScoreBg};
  --score-color: ${template.scoreColor};
  --score-color2: ${template.scoreColor2};
}`.trim();

	const previewScript = isPreview
		? `<script>setTimeout(()=>window.dispatchEvent(new MessageEvent('message',{data:${MOCK_STATE}})),500)</script>`
		: '';

	const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${cssVars}</style>${previewScript}</head><body>${template.customCode}</body></html>`;

	return new Response(html, {
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'Content-Security-Policy':
				"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' 'unsafe-eval'; img-src data: blob:; connect-src 'none'; font-src data:;",
			'X-Frame-Options': 'SAMEORIGIN'
		}
	});
};
