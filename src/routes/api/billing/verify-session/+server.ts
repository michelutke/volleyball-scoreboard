import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyAndActivateSession } from '$lib/server/billing';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request }) => {
	if (!env.STRIPE_SECRET_KEY) return json({ ok: false });

	const { sessionId } = await request.json();
	if (!sessionId || typeof sessionId !== 'string') return json({ ok: false });

	const ok = await verifyAndActivateSession(sessionId);
	return json({ ok });
};
