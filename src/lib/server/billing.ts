import { db } from '$lib/server/db';
import { settings } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { getStripe } from '$lib/server/stripe';

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'paused';

export async function getBillingStatus(orgId: string): Promise<'allowed' | 'blocked'> {
	const rows = await db
		.select()
		.from(settings)
		.where(and(eq(settings.orgId, orgId), eq(settings.key, 'subscriptionStatus')));

	const status = rows[0]?.value as SubscriptionStatus | undefined;
	if (status === 'active' || status === 'trialing') return 'allowed';
	return 'blocked';
}

export async function verifyAndActivateSession(sessionId: string, expectedOrgId?: string): Promise<boolean> {
	const session = await getStripe().checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });
	const orgId = session.metadata?.orgId ?? null;
	if (!orgId) return false;
	if (expectedOrgId !== undefined && orgId !== expectedOrgId) throw new SessionOrgMismatchError();
	if (session.status !== 'complete' && session.payment_status !== 'paid') return false;
	const subscription = session.subscription;
	if (!subscription || typeof subscription === 'string') return false;
	const status: SubscriptionStatus = subscription.status;
	// Only ever activate here. Downgrades come from the signed webhook, so a replayed (possibly
	// leaked) old session id can neither revive a canceled org nor block one that resubscribed.
	if (status !== 'active' && status !== 'trialing') return false;
	await upsertBillingSetting(orgId, 'subscriptionStatus', status);
	return true;
}

export class SessionOrgMismatchError extends Error {
	constructor() {
		super('Checkout session belongs to another organization');
	}
}

/**
 * An org had a subscription once any subscription status was stored. The Stripe customer id is
 * not a signal: signup creates the customer before the first checkout, and an abandoned first
 * checkout must still get the promised trial.
 */
export async function hasHadSubscription(orgId: string): Promise<boolean> {
	const rows = await db
		.select()
		.from(settings)
		.where(and(eq(settings.orgId, orgId), eq(settings.key, 'subscriptionStatus')));
	return rows.length > 0;
}

/** Stores the status unless a newer Stripe event was already applied for this org. */
export async function applySubscriptionStatus(orgId: string, status: SubscriptionStatus, eventCreated: number): Promise<boolean> {
	const rows = await db
		.select()
		.from(settings)
		.where(and(eq(settings.orgId, orgId), eq(settings.key, 'subscriptionEventAt')));
	const lastEventAt = Number(rows[0]?.value ?? 0);
	if (eventCreated < lastEventAt) return false;
	await upsertBillingSetting(orgId, 'subscriptionStatus', status);
	await upsertBillingSetting(orgId, 'subscriptionEventAt', String(eventCreated));
	return true;
}

export async function getStripeCustomerId(orgId: string): Promise<string | null> {
	const rows = await db
		.select()
		.from(settings)
		.where(and(eq(settings.orgId, orgId), eq(settings.key, 'stripeCustomerId')));
	return rows[0]?.value ?? null;
}

export async function getOrgByStripeCustomer(customerId: string): Promise<string | null> {
	const rows = await db
		.select()
		.from(settings)
		.where(and(eq(settings.key, 'stripeCustomerId'), eq(settings.value, customerId)));
	return rows[0]?.orgId ?? null;
}

export async function upsertBillingSetting(orgId: string, key: string, value: string): Promise<void> {
	await db
		.insert(settings)
		.values({ orgId, key, value })
		.onConflictDoUpdate({ target: [settings.orgId, settings.key], set: { value } });
}
