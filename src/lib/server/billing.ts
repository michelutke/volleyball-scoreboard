import { db } from '$lib/server/db';
import { settings } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';

export async function getBillingStatus(orgId: string): Promise<'allowed' | 'blocked'> {
	const rows = await db
		.select()
		.from(settings)
		.where(and(eq(settings.orgId, orgId), eq(settings.key, 'subscriptionStatus')));

	const status = rows[0]?.value;
	if (status === 'active' || status === 'trialing') return 'allowed';
	return 'blocked';
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
