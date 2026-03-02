import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStripe } from '$lib/server/stripe';
import { getOrgByStripeCustomer, upsertBillingSetting } from '$lib/server/billing';
import { env } from '$env/dynamic/private';
import type Stripe from 'stripe';

export const POST: RequestHandler = async ({ request }) => {
	if (!env.STRIPE_WEBHOOK_SECRET) throw error(503, 'Webhook not configured');

	const sig = request.headers.get('stripe-signature');
	if (!sig) throw error(400, 'Missing signature');

	const rawBody = await request.text();
	let event: Stripe.Event;
	try {
		event = getStripe().webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
	} catch {
		throw error(400, 'Invalid signature');
	}

	const resolveCustomerId = (customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null =>
		typeof customer === 'string' ? customer : (customer?.id ?? null);

	if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
		const sub = event.data.object as Stripe.Subscription;
		const orgId = await getOrgByStripeCustomer(resolveCustomerId(sub.customer)!);
		if (orgId) {
			const status = event.type === 'customer.subscription.deleted' ? 'canceled' : sub.status;
			await upsertBillingSetting(orgId, 'subscriptionStatus', status);
		}
	} else if (event.type === 'invoice.payment_failed') {
		const invoice = event.data.object as Stripe.Invoice;
		const customerId = resolveCustomerId(invoice.customer ?? null);
		if (customerId) {
			const orgId = await getOrgByStripeCustomer(customerId);
			if (orgId) await upsertBillingSetting(orgId, 'subscriptionStatus', 'past_due');
		}
	}

	return json({ received: true });
};
