import { json } from '@sveltejs/kit';
import { verifyMobileToken, type MobileIdentity } from '$lib/server/mobile-auth';

export function mobileJson(body: unknown, status = 200): Response {
	return json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function unauthorized(): Response {
	return mobileJson({ error: 'Unauthorized' }, 401);
}

export async function authenticateMobile(request: Request): Promise<MobileIdentity | null> {
	const auth = request.headers.get('authorization');
	if (!auth?.startsWith('Bearer ')) return null;
	return verifyMobileToken(auth.slice('Bearer '.length));
}
