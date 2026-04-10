import { sequence } from '@sveltejs/kit/hooks';
import { redirect } from '@sveltejs/kit';
import { handle as authHandle } from './auth';
import type { HandleServerError } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { bootstrapKcOrgId, ensureOrganizationMapper, ensureDirectAccessGrants, ensureRealmSettings, syncClientRedirectUri } from '$lib/server/keycloak-admin';
import { getBillingStatus } from '$lib/server/billing';
import { isRateLimited } from '$lib/server/rate-limit.js';

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
	'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
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

	if (path.startsWith('/api/') && !isPublic) {
		if (isRateLimited(`api:${event.getClientAddress()}`, { maxAttempts: 100, windowMs: 60 * 1000 })) {
			return new Response(JSON.stringify({ error: 'Too many requests' }), {
				status: 429,
				headers: { 'Content-Type': 'application/json' }
			});
		}
	}

	const response = await resolve(event);

	for (const [header, value] of Object.entries(securityHeaders)) {
		response.headers.set(header, value);
	}

	response.headers.delete('X-Powered-By');
	if (!isPublic) {
		response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
		response.headers.set('Pragma', 'no-cache');
	}

	// CSP is set by SvelteKit via svelte.config.js (with nonces) — only override per-route
	if (isOverlay(path)) {
		const csp = response.headers.get('content-security-policy');
		if (csp) {
			response.headers.set('content-security-policy', csp.replace("frame-ancestors 'self'", 'frame-ancestors *'));
		}
	} else if (path.startsWith('/api/overlay-sandbox')) {
		response.headers.delete('content-security-policy');
	}

	// Allow form-action to KC issuer (signout redirects to KC logout)
	if (env.KEYCLOAK_ISSUER) {
		const csp = response.headers.get('content-security-policy');
		if (csp) {
			const kcOrigin = new URL(env.KEYCLOAK_ISSUER).origin;
			response.headers.set('content-security-policy', csp.replace("form-action 'self'", `form-action 'self' ${kcOrigin}`));
		}
	}

	return response;
});
