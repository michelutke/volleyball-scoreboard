import type { JWT } from '@auth/core/jwt';
import type { Account, Session, User } from '@auth/core/types';
import { env } from '$env/dynamic/private';
import {
	getKcOrgIdForUser,
	getKcOrgIdFromAlias,
	getKcOrgIdByScanningMembers
} from '$lib/server/keycloak-admin';

export const REFRESH_TOKEN_ERROR = 'RefreshTokenError';
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const EXPIRY_SKEW_MS = 30 * 1000;
const DEFAULT_ACCESS_TOKEN_SECONDS = 300;

export interface TokenSet {
	access_token: string;
	refresh_token?: string;
	id_token?: string;
	expires_in?: number;
}

export interface KcIdentity {
	sub?: string;
	email?: string;
	name?: string;
	orgId?: string;
	roles: string[];
}

/**
 * KC 26 serializes the `organization` claim as either:
 *   object: { "alias": { "id": "uuid" } }          (older format)
 *   array:  ["alias", { "alias": { "id": "uuid" } }]  (KC 26 multivalued)
 */
function extractOrgIdFromClaim(claim: unknown): string | undefined {
	if (!claim) return undefined;
	if (Array.isArray(claim)) {
		for (const item of claim) {
			if (item && typeof item === 'object') {
				const id = Object.values(item as Record<string, { id?: string }>)[0]?.id;
				if (id) return id;
			}
		}
		return undefined;
	}
	return Object.values(claim as Record<string, { id?: string }>)[0]?.id;
}

/**
 * Extract the org alias string from the `organization` claim.
 * The alias is always present even when `addOrganizationId` is not configured.
 * Array format: ["alias", {...}] (first string element is the alias).
 * Object format: { "alias": {...} } (first key is the alias).
 */
function extractOrgAlias(claim: unknown): string | undefined {
	if (!claim) return undefined;
	if (Array.isArray(claim)) {
		const alias = claim.find((item) => typeof item === 'string');
		return alias as string | undefined;
	}
	if (typeof claim === 'object') {
		const key = Object.keys(claim as object)[0];
		return key || undefined;
	}
	return undefined;
}

function decodeAccessToken(accessToken: string): Record<string, unknown> {
	return JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString());
}

/** Derives subject, org and realm roles from a Keycloak access token (orgId via the 5-step chain). */
export async function deriveIdentity(accessToken: string): Promise<KcIdentity> {
	const payload = decodeAccessToken(accessToken);
	const sub = payload.sub as string | undefined;
	const orgClaim = payload.organization ?? payload.organizations;
	let orgId: string | undefined =
		(payload.org_id as string | undefined) ?? extractOrgIdFromClaim(orgClaim);
	// Fallback 1: resolve alias via service account (works without manage-clients/view-users)
	if (!orgId) {
		const alias = extractOrgAlias(orgClaim);
		if (alias) {
			try { orgId = await getKcOrgIdFromAlias(alias); } catch { /* non-fatal */ }
		}
	}
	// Fallback 2: KC admin API user->organizations lookup
	if (!orgId && sub) {
		try { orgId = await getKcOrgIdForUser(sub); } catch { /* non-fatal */ }
	}
	// Fallback 3: scan all org member lists (SA only, no master admin needed)
	if (!orgId && sub) {
		try { orgId = await getKcOrgIdByScanningMembers(sub); } catch { /* non-fatal */ }
	}
	return {
		sub,
		email: payload.email as string | undefined,
		name: payload.name as string | undefined,
		orgId,
		roles: (payload.realm_access as { roles?: string[] } | undefined)?.roles ?? []
	};
}

export function expiryFromNow(expiresInSeconds: number | undefined): number {
	return Date.now() + (expiresInSeconds ?? DEFAULT_ACCESS_TOKEN_SECONDS) * 1000;
}

function requestRefresh(refreshToken: string): Promise<Response> {
	return fetch(`${env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'refresh_token',
			client_id: env.KEYCLOAK_CLIENT_ID ?? '',
			client_secret: env.KEYCLOAK_CLIENT_SECRET ?? '',
			refresh_token: refreshToken
		})
	});
}

/**
 * Refreshes the Keycloak access token and re-derives org and roles from it.
 * A 4xx from Keycloak (invalid_grant: session revoked, user disabled or deleted) marks the
 * token as errored. Network errors and 5xx keep the current token so the next request retries.
 */
export async function refreshAccessToken(token: JWT): Promise<JWT> {
	if (!token.refreshToken) return { ...token, error: REFRESH_TOKEN_ERROR };
	let res: Response;
	try {
		res = await requestRefresh(token.refreshToken);
	} catch (err) {
		console.error('[auth] KC token refresh unreachable:', err);
		return token;
	}
	if (res.status >= 500) {
		console.error('[auth] KC token refresh server error:', res.status);
		return token;
	}
	if (!res.ok) {
		// Only invalid_grant means the Keycloak session is gone (revoked, expired, user disabled).
		// Anything else (bad client secret, proxy 403/429) keeps the session and retries later
		// instead of signing everyone out.
		const body = (await res.json().catch(() => null)) as { error?: string } | null;
		if (body?.error === 'invalid_grant') {
			console.warn('[auth] KC session ended, signing out sub:', token.sub);
			return { ...token, error: REFRESH_TOKEN_ERROR };
		}
		console.error('[auth] KC token refresh rejected:', res.status, body?.error, 'sub:', token.sub);
		return token;
	}
	try {
		const tokens = (await res.json()) as TokenSet;
		const identity = await deriveIdentity(tokens.access_token);
		return {
			...token,
			orgId: identity.orgId,
			roles: identity.roles,
			accessTokenExpires: expiryFromNow(tokens.expires_in),
			refreshToken: tokens.refresh_token ?? token.refreshToken,
			idToken: tokens.id_token ?? token.idToken,
			error: undefined
		};
	} catch (err) {
		console.error('[auth] KC token refresh response invalid:', err);
		return { ...token, error: REFRESH_TOKEN_ERROR };
	}
}

export async function jwtCallback({
	token,
	account,
	user
}: {
	token: JWT;
	account?: Account | null;
	user?: User | null;
}): Promise<JWT> {
	if (account?.access_token) {
		try {
			const identity = await deriveIdentity(account.access_token);
			if (!identity.orgId) console.error('[auth] OIDC: orgId extraction failed for sub:', identity.sub);
			token.orgId = identity.orgId;
			token.roles = identity.roles;
		} catch (err) {
			console.error('KC token decode failed', err);
		}
		token.accessTokenExpires = account.expires_at
			? account.expires_at * 1000
			: expiryFromNow(undefined);
		token.refreshToken = account.refresh_token;
		token.error = undefined;
	}
	if (account?.id_token) token.idToken = account.id_token;
	// Credentials flow: user object carries identity and token lifetime
	if (user?.orgId) token.orgId = user.orgId;
	if (user?.roles) token.roles = user.roles;
	if (user?.accessTokenExpires !== undefined) {
		token.accessTokenExpires = user.accessTokenExpires;
		token.refreshToken = user.refreshToken;
		token.idToken = user.idToken;
		token.error = undefined;
	}
	const freshLogin = Boolean(account || user);
	if (!freshLogin && !token.error) {
		const expired =
			!token.accessTokenExpires || Date.now() >= token.accessTokenExpires - EXPIRY_SKEW_MS;
		if (expired) token = await refreshAccessToken(token);
	}
	if (!token.error && !token.orgId && token.sub) {
		try { token.orgId = await getKcOrgIdForUser(token.sub); } catch { /* non-fatal */ }
		if (!token.orgId) console.error('[auth] jwt refresh: orgId still missing for sub:', token.sub);
	}
	return token;
}

export function sessionCallback({ session, token }: { session: Session; token: JWT }): Session {
	session.user.orgId = token.orgId;
	session.user.roles = token.roles ?? [];
	session.error = token.error;
	return session;
}
