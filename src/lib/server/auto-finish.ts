import { db } from '$lib/server/db/index.js';
import { matches } from '$lib/server/db/schema.js';
import { and, eq, isNotNull, isNull, lt, or } from 'drizzle-orm';

/** How long a guest scorer link keeps working after the match finished, so a wrong final point can be undone. */
export const GUEST_LINK_GRACE_MS = 10 * 60 * 1000;
const STALE_LIVE_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * Sets live matches to finished if scheduledAt is > 2 days ago, and clears the guest link of
 * matches finished longer than the grace period.
 */
export async function autoFinishStale(orgId: string, now: Date = new Date()): Promise<void> {
	await db
		.update(matches)
		.set({ status: 'finished', finishedAt: now, updatedAt: now })
		.where(
			and(
				eq(matches.orgId, orgId),
				eq(matches.status, 'live'),
				isNotNull(matches.scheduledAt),
				lt(matches.scheduledAt, new Date(now.getTime() - STALE_LIVE_MS))
			)
		);
	await db
		.update(matches)
		.set({ controlToken: null })
		.where(
			and(
				eq(matches.orgId, orgId),
				eq(matches.status, 'finished'),
				isNotNull(matches.controlToken),
				or(isNull(matches.finishedAt), lt(matches.finishedAt, new Date(now.getTime() - GUEST_LINK_GRACE_MS)))
			)
		);
}
