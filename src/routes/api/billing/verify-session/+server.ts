import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStripe } from '$lib/server/stripe';
import { upsertBillingSetting } from '$lib/server/billing';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request }) => {
	if (!env.STRIPE_SECRET_KEY) return json({ ok: false });

	const { sessionId } = await request.json();
	if (!sessionId || typeof sessionId !== 'string') return json({ ok: false });

	const session = await getStripe().checkout.sessions.retrieve(sessionId);
	if (session.status !== 'complete') return json({ ok: false });

	const orgId = session.metadata?.orgId ?? null;
	if (!orgId) return json({ ok: false });

	await upsertBillingSetting(orgId, 'subscriptionStatus', 'trialing');
	return json({ ok: true });
};
