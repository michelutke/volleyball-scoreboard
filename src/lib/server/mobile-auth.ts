import { createRemoteJWKSet, errors, jwtVerify, type JWTPayload } from 'jose';
import { env } from '$env/dynamic/private';

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

export function validateMobilePayload(payload: JWTPayload | Record<string, unknown>): string | null {
	const p = payload as Record<string, unknown>;
	if (p.azp !== MOBILE_CLIENT_ID) return null;
	return extractOrgId(payload);
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
		return validateMobilePayload(payload);
	} catch (e) {
		if (!isRoutineTokenError(e)) {
			console.error('[mobile-auth] verifyMobileToken failed:', e);
		}
		return null;
	}
}
