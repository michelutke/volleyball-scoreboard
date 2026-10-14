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

const MAX_INT4 = 2_147_483_647;

export function notFound(): Response {
	return mobileJson({ error: 'Match not found' }, 404);
}

export function finishedConflict(): Response {
	return mobileJson({ error: 'Match is finished' }, 409);
}

/** Accepts only positive integers that fit the serial column, so bad input never reaches Postgres. */
export function parseMatchId(raw: string): number | null {
	if (!/^\d{1,10}$/.test(raw)) return null;
	const id = Number(raw);
	return id >= 1 && id <= MAX_INT4 ? id : null;
}
