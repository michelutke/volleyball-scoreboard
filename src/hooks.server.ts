import { sequence } from '@sveltejs/kit/hooks';
import { redirect } from '@sveltejs/kit';
import { handle as authHandle } from './auth';
import type { HandleServerError } from '@sveltejs/kit';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from '$lib/server/db';
import { env } from '$env/dynamic/private';
import { bootstrapKcOrgId, ensureOrganizationMapper, ensureDirectAccessGrants, syncClientRedirectUri } from '$lib/server/keycloak-admin';
import { getBillingStatus } from '$lib/server/billing';

export async function init() {
	await migrate(db, { migrationsFolder: 'drizzle' });
	console.log('[db] migrations applied');
	await bootstrapKcOrgId();
	await ensureOrganizationMapper();
	await ensureDirectAccessGrants();
	if (env.ORIGIN) await syncClientRedirectUri(env.ORIGIN);
}

export const handleError: HandleServerError = ({ error, event }) => {
	console.error('[500]', event.url.pathname, error);
};

const PUBLIC_PATHS = ['/', '/auth', '/api/health', '/signin', '/signout', '/signup', '/privacy', '/imprint', '/api/billing/webhook'];
const OVERLAY_PATTERN = /^\/matches\/[^/]+\/overlay/;
const LEGACY_OVERLAY = /^\/overlay($|\/)/;
const BILLING_EXEMPT = /^\/(billing|api\/billing)($|\/)(?!webhook)/;

export const handle = sequence(authHandle, async ({ event, resolve }) => {
	const path = event.url.pathname;
	const isPublic =
		PUBLIC_PATHS.some((p) => (p === '/' ? path === '/' : path.startsWith(p))) ||
		OVERLAY_PATTERN.test(path) ||
		LEGACY_OVERLAY.test(path);

	if (!isPublic) {
		const session = await event.locals.auth();
		if (!session) redirect(307, `/signin?callbackUrl=${encodeURIComponent(event.url.pathname)}`);
		event.locals.session = session;
		event.locals.orgId = session.user.orgId ?? 'default';
		event.locals.isAdmin = (session.user.roles ?? []).includes('admin');

		if (env.STRIPE_SECRET_KEY && !BILLING_EXEMPT.test(path)) {
			const status = await getBillingStatus(event.locals.orgId);
			if (status === 'blocked') redirect(307, '/billing');
		}
	}

	return resolve(event);
});
