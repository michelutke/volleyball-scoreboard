import { sequence } from '@sveltejs/kit/hooks';
import { redirect } from '@sveltejs/kit';
import { handle as authHandle } from './auth';
import type { HandleServerError } from '@sveltejs/kit';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from '$lib/server/db';
import { settings } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { getAdminToken } from '$lib/server/keycloak-admin';

export async function init() {
	await migrate(db, { migrationsFolder: 'drizzle' });
	console.log('[db] migrations applied');
	await bootstrapKcOrgId();
}

async function bootstrapKcOrgId(): Promise<void> {
	if (!env.KEYCLOAK_ADMIN_URL || !env.KEYCLOAK_ADMIN_CLIENT_SECRET) return;
	const existing = await db.query.settings.findFirst({
		where: and(eq(settings.orgId, 'default'), eq(settings.key, 'kcOrgId'))
	});
	if (existing) return;
	try {
		const token = await getAdminToken();
		const realm = env.KEYCLOAK_REALM ?? 'scoring';
		const res = await fetch(`${env.KEYCLOAK_ADMIN_URL}/admin/realms/${realm}/organizations`, {
			headers: { Authorization: `Bearer ${token}` }
		});
		if (!res.ok) return;
		const orgs: { id: string; name: string }[] = await res.json();
		if (orgs.length === 0) return;
		await db.insert(settings).values({ orgId: 'default', key: 'kcOrgId', value: orgs[0].id })
			.onConflictDoNothing();
		console.log('[keycloak] kcOrgId auto-configured:', orgs[0].id);
	} catch (e) {
		console.warn('[keycloak] kcOrgId bootstrap failed (non-fatal):', e);
	}
}

export const handleError: HandleServerError = ({ error, event }) => {
	console.error('[500]', event.url.pathname, error);
};

const PUBLIC_PATHS = ['/auth', '/api/health', '/signin', '/signout'];
const OVERLAY_PATTERN = /^\/matches\/[^/]+\/overlay/;
const LEGACY_OVERLAY = /^\/overlay/;

export const handle = sequence(authHandle, async ({ event, resolve }) => {
	const path = event.url.pathname;
	const isPublic =
		PUBLIC_PATHS.some((p) => path.startsWith(p)) ||
		OVERLAY_PATTERN.test(path) ||
		LEGACY_OVERLAY.test(path);

	if (!isPublic) {
		const session = await event.locals.auth();
		if (!session) redirect(307, `/signin?callbackUrl=${encodeURIComponent(event.url.pathname)}`);
		event.locals.session = session;
		event.locals.orgId = session.user.orgId ?? 'default';
		event.locals.isAdmin = (session.user.roles ?? []).includes('admin');
	}

	return resolve(event);
});
