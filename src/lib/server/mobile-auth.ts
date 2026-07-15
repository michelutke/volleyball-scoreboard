import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { env } from '$env/dynamic/private';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

export async function verifyMobileToken(token: string): Promise<string | null> {
	try {
		jwks ??= createRemoteJWKSet(
			new URL(`${env.KEYCLOAK_ISSUER}/protocol/openid-connect/certs`)
		);
		const { payload } = await jwtVerify(token, jwks, { issuer: env.KEYCLOAK_ISSUER });
		return extractOrgId(payload);
	} catch {
		return null;
	}
}
