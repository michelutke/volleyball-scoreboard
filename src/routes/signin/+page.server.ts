import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const raw = event.url.searchParams.get('callbackUrl') ?? '/';
	const callbackUrl = raw.startsWith('/') && !raw.startsWith('/signin') ? raw : '/';
	await event.locals.signIn('keycloak', { redirectTo: callbackUrl });
};
