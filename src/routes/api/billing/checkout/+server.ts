import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStripe } from '$lib/server/stripe';
import { getStripeCustomerId } from '$lib/server/billing';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ locals, url }) => {
	if (!locals.isAdmin) throw error(403, 'Forbidden');
	if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID) throw error(503, 'Billing not configured');

	const customerId = await getStripeCustomerId(locals.orgId);

	const session = await getStripe().checkout.sessions.create({
		mode: 'subscription',
		line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
		customer: customerId ?? undefined,
		metadata: { orgId: locals.orgId },
		subscription_data: {
			trial_period_days: 3,
			metadata: { orgId: locals.orgId }
		},
		payment_method_collection: 'always',
		success_url: `${url.origin}/billing`,
		cancel_url: `${url.origin}/billing`
	});

	return json({ url: session.url });
};
