import { SvelteKitAuth } from '@auth/sveltekit';
import Keycloak from '@auth/sveltekit/providers/keycloak';
import { env } from '$env/dynamic/private';

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

export const { handle, signIn, signOut } = SvelteKitAuth({
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
				// Decode access token to extract Keycloak-specific claims
				try {
					const payload = JSON.parse(
						Buffer.from(account.access_token.split('.')[1], 'base64url').toString()
					);
					// KC 26: org_id may be a direct claim (explicit mapper) or inside
					// the organizations map (oidc-organization-membership-mapper with addOrganizationId)
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
});
