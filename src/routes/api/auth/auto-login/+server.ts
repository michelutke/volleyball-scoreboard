import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { serverCredentialsSignIn } from '../../../../auth';
import { getStripe } from '$lib/server/stripe';
import { upsertBillingSetting } from '$lib/server/billing';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async (event) => {
	const { email, password, sessionId } = (await event.request.json()) as {
		email: string;
		password: string;
		sessionId: string;
	};

	if (!email || !password || !sessionId) {
		return json({ ok: false, redirectUrl: '/signin?registered=1' }, { status: 400 });
	}

	// Verify Stripe session + activate billing (replaces /api/billing/verify-session)
	if (env.STRIPE_SECRET_KEY) {
		try {
			const session = await getStripe().checkout.sessions.retrieve(sessionId);
			const orgId = session.metadata?.orgId;
			if (orgId && (session.status === 'complete' || session.payment_status === 'paid')) {
				await upsertBillingSetting(orgId, 'subscriptionStatus', 'trialing');
			}
		} catch (e) {
			console.error('[auto-login] stripe verify failed:', e);
		}
	}

	const result = await serverCredentialsSignIn(event, email, password, '/dashboard');
	return json(result);
};
