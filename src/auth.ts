import { SvelteKitAuth, type SvelteKitAuthConfig } from '@auth/sveltekit';
import { Auth, createActionURL, raw, skipCSRFCheck, setEnvDefaults } from '@auth/core';
import Keycloak from '@auth/sveltekit/providers/keycloak';
import Credentials from '@auth/core/providers/credentials';
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
			idToken?: string;
		};
	}
	interface User {
		orgId?: string;
		roles?: string[];
	}
}

declare module '@auth/core/jwt' {
	interface JWT {
		orgId?: string;
		roles?: string[];
		idToken?: string;
	}
}

const baseConfig: SvelteKitAuthConfig = {
	trustHost: true,
	pages: { signIn: '/signin', error: '/signin' },
	providers: [
		Keycloak({
			clientId: env.KEYCLOAK_CLIENT_ID,
			clientSecret: env.KEYCLOAK_CLIENT_SECRET,
			issuer: env.KEYCLOAK_ISSUER
		}),
		Credentials({
			credentials: { email: {}, password: {} },
			async authorize(credentials) {
				if (!credentials?.email || !credentials?.password) return null;
				const tokenRes = await fetch(`${env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					body: new URLSearchParams({
						grant_type: 'password',
						client_id: env.KEYCLOAK_CLIENT_ID ?? '',
						client_secret: env.KEYCLOAK_CLIENT_SECRET ?? '',
						username: credentials.email as string,
						password: credentials.password as string,
						scope: 'openid'
					})
				});
				if (!tokenRes.ok) return null;
				const tokens: { access_token: string } = await tokenRes.json();
				try {
					const payload = JSON.parse(Buffer.from(tokens.access_token.split('.')[1], 'base64url').toString());
					const orgsMap = payload.organizations as Record<string, { id?: string }> | undefined;
					const firstOrgId = orgsMap ? Object.values(orgsMap)[0]?.id : undefined;
					return {
						id: payload.sub,
						email: payload.email,
						name: payload.name,
						orgId: (payload.org_id as string | undefined) ?? firstOrgId,
						roles: (payload.realm_access?.roles as string[]) ?? []
					};
				} catch {
					return null;
				}
			}
		})
	],
	callbacks: {
		jwt({ token, account, user }) {
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
			if (account?.id_token) token.idToken = account.id_token;
			// Credentials flow: user object carries orgId + roles
			if (user?.orgId) token.orgId = user.orgId;
			if (user?.roles) token.roles = user.roles;
			return token;
		},
		session({ session, token }) {
			session.user.orgId = token.orgId;
			session.user.roles = token.roles ?? [];
			session.user.idToken = token.idToken;
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
	const authUrl = env.AUTH_URL ?? env.ORIGIN;
	const protocol = authUrl ? new URL(authUrl).protocol : event.url.protocol;
	const signinURL = createActionURL('signin', protocol, headers, env, config);
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
