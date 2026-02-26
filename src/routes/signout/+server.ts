import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async (event) => {
	const session = await event.locals.auth();
	const cookieBases = ['authjs.session-token', 'authjs.callback-url', 'authjs.csrf-token'];
	for (const name of cookieBases) {
		event.cookies.delete(name, { path: '/' });
		event.cookies.delete(`__Secure-${name}`, { path: '/' });
		event.cookies.delete(`__Host-${name}`, { path: '/' });
	}
	const returnUrl = encodeURIComponent(`${event.url.origin}/signin`);
	const clientId = encodeURIComponent(env.KEYCLOAK_CLIENT_ID!);
	const idTokenHint = session?.user?.idToken
		? `&id_token_hint=${encodeURIComponent(session.user.idToken)}`
		: '';
	redirect(302, `${env.KEYCLOAK_ISSUER}/protocol/openid-connect/logout?client_id=${clientId}&post_logout_redirect_uri=${returnUrl}${idTokenHint}`);
};
