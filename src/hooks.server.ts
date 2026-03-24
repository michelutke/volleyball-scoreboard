import { sequence } from '@sveltejs/kit/hooks';
import { redirect } from '@sveltejs/kit';
import { handle as authHandle } from './auth';
import type { HandleServerError } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { bootstrapKcOrgId, ensureOrganizationMapper, ensureDirectAccessGrants, ensureRealmSettings, syncClientRedirectUri } from '$lib/server/keycloak-admin';
import { getBillingStatus } from '$lib/server/billing';

export async function init() {
	await bootstrapKcOrgId();
	await ensureOrganizationMapper();
	await ensureDirectAccessGrants();
	await ensureRealmSettings();
	if (env.ORIGIN) await syncClientRedirectUri(env.ORIGIN);
}

export const handleError: HandleServerError = ({ error, event }) => {
	console.error('[500]', event.url.pathname, error);
};

const PUBLIC_PATHS = ['/', '/auth', '/api/health', '/signin', '/signout', '/signup', '/privacy', '/imprint', '/about', '/api/billing/webhook', '/api/auth/auto-login', '/library', '/api/overlay-sandbox'];
const OVERLAY_PATTERN = /^\/matches\/[^/]+\/overlay/;
const LEGACY_OVERLAY = /^\/overlay($|\/)/;
const SHARE_CONTROL = /^\/(c|api\/c)\//;
const BILLING_EXEMPT = /^\/(billing|api\/billing)($|\/)(?!webhook)/;

const isOverlay = (path: string): boolean =>
	OVERLAY_PATTERN.test(path) || LEGACY_OVERLAY.test(path);

const securityHeaders: Record<string, string> = {
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
	'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
	'Content-Security-Policy': [
		"default-src 'self'",
		"script-src 'self' https://js.stripe.com",
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
		"font-src 'self' https://fonts.gstatic.com data:",
		"img-src 'self' https: data: blob:",
		"connect-src 'self' https://api.stripe.com",
		"frame-src 'self' https://js.stripe.com",
		"frame-ancestors 'self'",
		"base-uri 'self'",
		"form-action 'self'"
	].join('; ')
};

export const handle = sequence(authHandle, async ({ event, resolve }) => {
	const path = event.url.pathname;
	const isPublic =
		PUBLIC_PATHS.some((p) => (p === '/' ? path === '/' : path.startsWith(p))) ||
		isOverlay(path) ||
		SHARE_CONTROL.test(path);

	if (!isPublic) {
		const session = await event.locals.auth();
		if (!session) redirect(307, `/signin?callbackUrl=${encodeURIComponent(event.url.pathname)}`);

		if (!session.user.orgId) {
			// org extraction failed — clear session and redirect to prevent cross-org data leakage
			console.error('[auth] orgId missing for user:', session.user.email, '— signing out');
			for (const name of ['authjs.session-token', 'authjs.callback-url', 'authjs.csrf-token']) {
				event.cookies.delete(name, { path: '/' });
				event.cookies.delete(`__Secure-${name}`, { path: '/' });
				event.cookies.delete(`__Host-${name}`, { path: '/' });
			}
			redirect(307, '/signin?error=OrgNotFound');
		}

		event.locals.session = session;
		event.locals.orgId = session.user.orgId;
		event.locals.isAdmin = (session.user.roles ?? []).includes('admin');

		if (env.STRIPE_SECRET_KEY && !BILLING_EXEMPT.test(path) && !SHARE_CONTROL.test(path)) {
			const status = await getBillingStatus(event.locals.orgId);
			if (status === 'blocked') redirect(307, '/billing');
		}
	}

	const response = await resolve(event);

	for (const [header, value] of Object.entries(securityHeaders)) {
		if (header === 'Content-Security-Policy' && isOverlay(path)) {
			// Overlays are embedded in OBS — allow framing from anywhere
			const overlayCSP = value.replace("frame-ancestors 'self'", 'frame-ancestors *');
			response.headers.set(header, overlayCSP);
		} else if (header === 'Content-Security-Policy' && path.startsWith('/api/overlay-sandbox')) {
			// Sandbox endpoint sets its own CSP — skip global
			continue;
		} else {
			response.headers.set(header, value);
		}
	}

	return response;
});
