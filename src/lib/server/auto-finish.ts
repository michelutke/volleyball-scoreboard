import { db } from '$lib/server/db/index.js';
import { matches } from '$lib/server/db/schema.js';
import { and, eq, lt, isNotNull } from 'drizzle-orm';

/** Set live matches to finished if scheduledAt is > 2 days ago. */
export async function autoFinishStale(orgId: string): Promise<void> {
	const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
	await db
		.update(matches)
		.set({ status: 'finished', updatedAt: new Date() })
		.where(
			and(
				eq(matches.orgId, orgId),
				eq(matches.status, 'live'),
				isNotNull(matches.scheduledAt),
				lt(matches.scheduledAt, cutoff)
			)
		);
}
