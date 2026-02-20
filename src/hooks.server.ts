import { sequence } from '@sveltejs/kit/hooks';
import { redirect } from '@sveltejs/kit';
import { handle as authHandle } from './auth';
import type { HandleServerError } from '@sveltejs/kit';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from '$lib/server/db';

export async function init() {
	await migrate(db, { migrationsFolder: 'drizzle' });
	console.log('[db] migrations applied');
}

export const handleError: HandleServerError = ({ error, event }) => {
	console.error('[500]', event.url.pathname, error);
};

const PUBLIC_PATHS = ['/auth', '/api/auth'];
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
		if (!session) redirect(307, '/auth/signin');
		event.locals.session = session;
		event.locals.orgId = session.user.orgId ?? 'default';
		event.locals.isAdmin = (session.user.roles ?? []).includes('admin');
	}

	return resolve(event);
});
