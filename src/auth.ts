import { SvelteKitAuth, type SvelteKitAuthConfig } from '@auth/sveltekit';
import { Auth, createActionURL, raw, skipCSRFCheck, setEnvDefaults } from '@auth/core';
import Keycloak from '@auth/sveltekit/providers/keycloak';
import { base } from '$app/paths';
import { env } from '$env/dynamic/private';
import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

declare module '@auth/core/types' {
	interface Session {
		user: {
			name?: string | null;
			email?: string | null;
			image?: string | null;
			orgId?: string;
			roles?: string[];
		};
	}
}

declare module '@auth/core/jwt' {
	interface JWT {
		orgId?: string;
		roles?: string[];
	}
}

const baseConfig: SvelteKitAuthConfig = {
	trustHost: true,
	providers: [
		Keycloak({
			clientId: env.KEYCLOAK_CLIENT_ID,
			clientSecret: env.KEYCLOAK_CLIENT_SECRET,
			issuer: env.KEYCLOAK_ISSUER
		})
	],
	callbacks: {
		jwt({ token, account }) {
			if (account?.access_token) {
				try {
					const payload = JSON.parse(
						Buffer.from(account.access_token.split('.')[1], 'base64url').toString()
					);
					const orgsMap = payload.organizations as Record<string, { id?: string }> | undefined;
					const firstOrgId = orgsMap ? Object.values(orgsMap)[0]?.id : undefined;
					token.orgId = (payload.org_id as string | undefined) ?? firstOrgId;
					token.roles = (payload.realm_access?.roles as string[]) ?? [];
				} catch (err) {
					console.error('KC token decode failed', err);
				}
			}
			return token;
		},
		session({ session, token }) {
			session.user.orgId = token.orgId;
			session.user.roles = token.roles ?? [];
			return session;
		}
	}
};

export const { handle, signIn, signOut } = SvelteKitAuth(baseConfig);

/**
 * Server-side OAuth initiation for use in `load` functions.
 * Replicates @auth/sveltekit internal signIn using public @auth/core APIs.
 */
export async function serverSignIn(
	event: RequestEvent,
	provider: string,
	redirectTo: string
): Promise<never> {
	// Must assign unique symbols directly — TS widens them when spread
	const config: SvelteKitAuthConfig = { ...baseConfig, basePath: `${base}/auth` };
	config.skipCSRFCheck = skipCSRFCheck;
	setEnvDefaults(env, config);

	const headers = new Headers(event.request.headers);
	const signinURL = createActionURL('signin', event.url.protocol, headers, env, config);
	headers.set('Content-Type', 'application/x-www-form-urlencoded');
	const body = new URLSearchParams({ callbackUrl: redirectTo });
	const req = new Request(`${signinURL}/${provider}`, { method: 'POST', headers, body });

	const configWithRaw: SvelteKitAuthConfig & { raw: typeof raw } = config as SvelteKitAuthConfig & { raw: typeof raw };
	configWithRaw.raw = raw;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const res = await Auth(req, configWithRaw) as any;

	for (const c of res?.cookies ?? []) {
		event.cookies.set(c.name, c.value, { path: '/', ...c.options });
	}
	redirect(302, res.redirect);
}
