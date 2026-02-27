import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stripe } from '$lib/server/stripe';
import { getStripeCustomerId } from '$lib/server/billing';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ locals, url }) => {
	if (!locals.isAdmin) throw error(403, 'Forbidden');
	if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID) throw error(503, 'Billing not configured');

	const customerId = await getStripeCustomerId(locals.orgId);

	const session = await stripe.checkout.sessions.create({
		mode: 'subscription',
		line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
		customer: customerId ?? undefined,
		metadata: { orgId: locals.orgId },
		success_url: `${url.origin}/billing`,
		cancel_url: `${url.origin}/billing`
	});

	return json({ url: session.url });
};
