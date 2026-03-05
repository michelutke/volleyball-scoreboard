import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = ({ url }) => {
	const raw = url.searchParams.get('callbackUrl') ?? '/dashboard';
	const callbackUrl = raw.startsWith('/') && !raw.startsWith('/signin') ? raw : '/dashboard';
	return {
		callbackUrl,
		error: url.searchParams.get('error') ?? null,
		kcIssuer: env.KEYCLOAK_ISSUER ?? ''
	};
};
