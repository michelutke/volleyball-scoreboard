import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStripe } from '$lib/server/stripe';
import { getStripeCustomerId, hasHadSubscription } from '$lib/server/billing';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ locals, url }) => {
	if (!locals.isAdmin) throw error(403, 'Forbidden');
	if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID) throw error(503, 'Billing not configured');

	const customerId = await getStripeCustomerId(locals.orgId);
	const trialEligible = !(await hasHadSubscription(locals.orgId));

	const session = await getStripe().checkout.sessions.create({
		mode: 'subscription',
		line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
		customer: customerId ?? undefined,
		metadata: { orgId: locals.orgId },
		subscription_data: {
			...(trialEligible ? { trial_period_days: 3 } : {}),
			metadata: { orgId: locals.orgId }
		},
		payment_method_collection: 'always',
		ui_mode: 'embedded',
		redirect_on_completion: 'never'
	});

	return json({ clientSecret: session.client_secret, sessionId: session.id });
};
