import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { clearAuthCookies, readIdToken } from '$lib/server/auth-session';

export const POST: RequestHandler = async (event) => {
	const idToken = await readIdToken(event.request);
	clearAuthCookies(event.cookies);
	const returnUrl = encodeURIComponent(`${event.url.origin}/signin`);
	const clientId = encodeURIComponent(env.KEYCLOAK_CLIENT_ID!);
	const idTokenHint = idToken ? `&id_token_hint=${encodeURIComponent(idToken)}` : '';
	redirect(302, `${env.KEYCLOAK_ISSUER}/protocol/openid-connect/logout?client_id=${clientId}&post_logout_redirect_uri=${returnUrl}${idTokenHint}`);
};
