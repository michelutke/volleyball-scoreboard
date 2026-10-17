import type { Cookies } from '@sveltejs/kit';
import type { Session } from '@auth/core/types';
import { getToken } from '@auth/core/jwt';
import { env } from '$env/dynamic/private';
import { REFRESH_TOKEN_ERROR } from '$lib/server/auth-tokens';

const AUTH_COOKIE_BASES = ['authjs.session-token', 'authjs.callback-url', 'authjs.csrf-token'];
const COOKIE_PREFIXES = ['', '__Secure-', '__Host-'];
const AUTH_COOKIE_PREFIXES = AUTH_COOKIE_BASES.flatMap((base) =>
	COOKIE_PREFIXES.map((prefix) => `${prefix}${base}`)
);

/** Deletes every Auth.js cookie including chunked session cookies (`authjs.session-token.0`, `.1`, ...). */
export function clearAuthCookies(cookies: Cookies): void {
	for (const { name } of cookies.getAll()) {
		if (AUTH_COOKIE_PREFIXES.some((prefix) => name === prefix || name.startsWith(`${prefix}.`))) {
			cookies.delete(name, { path: '/' });
		}
	}
}

export type SessionRejection = 'SessionExpired' | 'OrgNotFound';

/** Why an otherwise present session must be treated as signed out, or null when it is usable. */
export function sessionRejection(session: Session): SessionRejection | null {
	if (session.error === REFRESH_TOKEN_ERROR) return 'SessionExpired';
	if (!session.user.orgId) return 'OrgNotFound';
	return null;
}

/** Reads the Keycloak id token from the encrypted session cookie, server-side only. */
export async function readIdToken(request: Request): Promise<string | undefined> {
	if (!env.AUTH_SECRET) return undefined;
	for (const secureCookie of [true, false]) {
		const token = await getToken({ req: request, secret: env.AUTH_SECRET, secureCookie });
		if (token) return token.idToken;
	}
	return undefined;
}
