import { db } from '$lib/server/db';
import { settings } from '$lib/server/db/schema';
import { and, eq, inArray } from 'drizzle-orm';

export const TRIAL_DAYS = 3;

export async function getBillingStatus(orgId: string): Promise<'allowed' | 'blocked'> {
	const rows = await db
		.select()
		.from(settings)
		.where(and(eq(settings.orgId, orgId), inArray(settings.key, ['subscriptionStatus', 'trialStartedAt'])));

	const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
	const status = byKey['subscriptionStatus'];

	if (status === 'active') return 'allowed';

	if (status === 'trialing') {
		const trialStartedAt = byKey['trialStartedAt'];
		if (!trialStartedAt) return 'blocked';
		const ageDays = (Date.now() - new Date(trialStartedAt).getTime()) / (1000 * 60 * 60 * 24);
		return ageDays <= TRIAL_DAYS ? 'allowed' : 'blocked';
	}

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
