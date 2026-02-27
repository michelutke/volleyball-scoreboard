import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { settings } from '$lib/server/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { TRIAL_DAYS } from '$lib/server/billing';

export const load: PageServerLoad = async ({ locals }) => {
	const rows = await db
		.select()
		.from(settings)
		.where(and(eq(settings.orgId, locals.orgId), inArray(settings.key, ['subscriptionStatus', 'trialStartedAt'])));

	const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
	const subscriptionStatus = byKey['subscriptionStatus'] ?? null;
	const trialStartedAt = byKey['trialStartedAt'] ?? null;

	let daysLeft: number | null = null;
	if (subscriptionStatus === 'trialing' && trialStartedAt) {
		const ageDays = (Date.now() - new Date(trialStartedAt).getTime()) / (1000 * 60 * 60 * 24);
		daysLeft = Math.max(0, Math.ceil(TRIAL_DAYS - ageDays));
	}

	return { subscriptionStatus, daysLeft };
};
