import { createRemoteJWKSet, errors, jwtVerify, type JWTPayload } from 'jose';
import { env } from '$env/dynamic/private';
import {
	getKcOrgIdByScanningMembers,
	getKcOrgIdForUser,
	getKcOrgIdFromAlias
} from '$lib/server/keycloak-admin';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MOBILE_CLIENT_ID = env.MOBILE_CLIENT_ID ?? 'scorely-mobile';

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

export function extractOrgId(payload: JWTPayload | Record<string, unknown>): string | null {
	const p = payload as Record<string, unknown>;
	if (typeof p.org_id === 'string' && UUID_RE.test(p.org_id)) return p.org_id;
	for (const key of ['organization', 'organizations']) {
		const claim = p[key];
		const candidates = Array.isArray(claim) ? claim : [claim];
		for (const entry of candidates) {
			if (entry && typeof entry === 'object') {
				for (const value of Object.values(entry as Record<string, unknown>)) {
					const id = (value as { id?: unknown })?.id;
					if (typeof id === 'string' && UUID_RE.test(id)) return id;
				}
			}
		}
	}
	return null;
}

/**
 * Org alias is present even when the mapper lacks addOrganizationId:
 * array form ["alias"] / ["alias", { alias: {...} }] or object form { alias: {...} }.
 */
export function extractOrgAlias(payload: JWTPayload | Record<string, unknown>): string | null {
	const p = payload as Record<string, unknown>;
	for (const key of ['organization', 'organizations']) {
		const claim = p[key];
		if (Array.isArray(claim)) {
			const alias = claim.find((item) => typeof item === 'string');
			if (alias) return alias as string;
			for (const item of claim) {
				if (item && typeof item === 'object') {
					const k = Object.keys(item as object)[0];
					if (k) return k;
				}
			}
		} else if (claim && typeof claim === 'object') {
			const k = Object.keys(claim as object)[0];
			if (k) return k;
		}
	}
	return null;
}

export function validateMobilePayload(payload: JWTPayload | Record<string, unknown>): string | null {
	const p = payload as Record<string, unknown>;
	if (p.azp !== MOBILE_CLIENT_ID) {
		console.warn(`[mobile-auth] azp mismatch: expected "${MOBILE_CLIENT_ID}", got "${p.azp}"`);
		return null;
	}
	return extractOrgId(payload);
}

const orgIdByUser = new Map<string, string>();

async function lookupOrgId(alias: string | null, sub: string | undefined): Promise<string | null> {
	const attempts: (() => Promise<string | undefined>)[] = [];
	// KC organizations?search= matches name/domain, not alias — only hits when they coincide.
	if (alias) attempts.push(() => getKcOrgIdFromAlias(alias));
	if (sub) attempts.push(() => getKcOrgIdForUser(sub), () => getKcOrgIdByScanningMembers(sub));
	for (const attempt of attempts) {
		try {
			const id = await attempt();
			if (id) return id;
		} catch {
			// non-fatal, try next strategy
		}
	}
	return null;
}

export async function resolveMobileOrgId(
	payload: JWTPayload | Record<string, unknown>
): Promise<string | null> {
	const p = payload as Record<string, unknown>;
	if (p.azp !== MOBILE_CLIENT_ID) {
		console.warn(`[mobile-auth] azp mismatch: expected "${MOBILE_CLIENT_ID}", got "${p.azp}"`);
		return null;
	}
	const fromClaim = extractOrgId(payload);
	if (fromClaim) return fromClaim;
	const sub = typeof p.sub === 'string' ? p.sub : undefined;
	const cached = sub ? orgIdByUser.get(sub) : undefined;
	if (cached) return cached;
	const alias = extractOrgAlias(payload);
	if (!alias && !sub) {
		console.warn('[mobile-auth] token valid but no org claim or sub — org mapper missing or user has no org membership');
		return null;
	}
	const orgId = await lookupOrgId(alias, sub);
	if (!orgId) {
		console.warn(`[mobile-auth] could not resolve org for alias "${alias}" / sub "${sub}" via Keycloak admin API`);
		return null;
	}
	if (sub) orgIdByUser.set(sub, orgId);
	return orgId;
}

function isRoutineTokenError(e: unknown): boolean {
	return (
		e instanceof errors.JWTExpired ||
		e instanceof errors.JWTClaimValidationFailed ||
		e instanceof errors.JWTInvalid ||
		e instanceof errors.JWSInvalid ||
		e instanceof errors.JWSSignatureVerificationFailed
	);
}

export async function verifyMobileToken(token: string): Promise<string | null> {
	try {
		jwks ??= createRemoteJWKSet(
			new URL(`${env.KEYCLOAK_ISSUER}/protocol/openid-connect/certs`)
		);
		const { payload } = await jwtVerify(token, jwks, { issuer: env.KEYCLOAK_ISSUER });
		return resolveMobileOrgId(payload);
	} catch (e) {
		if (!isRoutineTokenError(e)) {
			console.error('[mobile-auth] verifyMobileToken failed:', e);
		}
		return null;
	}
}
