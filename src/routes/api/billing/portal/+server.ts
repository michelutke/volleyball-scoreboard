import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stripe } from '$lib/server/stripe';
import { getStripeCustomerId } from '$lib/server/billing';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ locals, url }) => {
	if (!locals.isAdmin) throw error(403, 'Forbidden');
	if (!env.STRIPE_SECRET_KEY) throw error(503, 'Billing not configured');

	const customerId = await getStripeCustomerId(locals.orgId);
	if (!customerId) throw error(404, 'No billing account');

	const session = await stripe.billingPortal.sessions.create({
		customer: customerId,
		return_url: `${url.origin}/billing`
	});

	return json({ url: session.url });
};
