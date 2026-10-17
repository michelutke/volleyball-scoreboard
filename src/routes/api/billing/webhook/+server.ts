import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStripe } from '$lib/server/stripe';
import { getOrgByStripeCustomer, upsertBillingSetting } from '$lib/server/billing';
import { env } from '$env/dynamic/private';
import type Stripe from 'stripe';

const processedEvents = new Set<string>();
const MAX_PROCESSED = 10000;

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

	if (processedEvents.has(event.id)) {
		return json({ received: true });
	}
	if (processedEvents.size >= MAX_PROCESSED) {
		const first = processedEvents.values().next().value;
		if (first) processedEvents.delete(first);
	}
	processedEvents.add(event.id);

	const resolveCustomerId = (customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null =>
		typeof customer === 'string' ? customer : (customer?.id ?? null);

	if (event.type === 'checkout.session.completed') {
		const session = event.data.object as Stripe.Checkout.Session;
		const orgId = session.metadata?.orgId ?? null;
		const customerId = resolveCustomerId(session.customer ?? null);
		console.log('[webhook] checkout.session.completed', { orgId, customerId });
		if (orgId && customerId) {
			await upsertBillingSetting(orgId, 'stripeCustomerId', customerId);
			await upsertBillingSetting(orgId, 'subscriptionStatus', 'trialing');
		} else {
			console.warn('[webhook] checkout.session.completed: missing orgId or customerId, skipping');
		}
	} else if (
		event.type === 'customer.subscription.created' ||
		event.type === 'customer.subscription.updated' ||
		event.type === 'customer.subscription.deleted'
	) {
		const sub = event.data.object as Stripe.Subscription;
		const customerId = resolveCustomerId(sub.customer);
		const orgIdFromMeta = sub.metadata?.orgId ?? null;
		const orgIdFromDb = customerId ? await getOrgByStripeCustomer(customerId) : null;
		const orgId = orgIdFromMeta ?? orgIdFromDb;
		console.log('[webhook]', event.type, { customerId, orgIdFromMeta, orgIdFromDb, orgId, status: sub.status });
		if (orgId && customerId) {
			await upsertBillingSetting(orgId, 'stripeCustomerId', customerId);
			const status = event.type === 'customer.subscription.deleted' ? 'canceled' : sub.status;
			await upsertBillingSetting(orgId, 'subscriptionStatus', status);
		} else {
			console.warn('[webhook]', event.type, ': missing orgId or customerId, skipping');
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
