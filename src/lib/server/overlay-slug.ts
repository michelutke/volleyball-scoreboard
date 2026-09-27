import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { settings } from '$lib/server/db/schema.js';

export function slugify(input: string): string {
	return input
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

async function isSlugTaken(slug: string, orgId: string): Promise<boolean> {
	const row = await db.query.settings.findFirst({
		where: and(eq(settings.key, 'overlaySlug'), eq(settings.value, slug))
	});
	return !!row && row.orgId !== orgId;
}

/**
 * Every org gets a permanent public overlay URL (/overlay/{slug}). Orgs created before
 * signup started assigning a slug get one derived from their club name on first use.
 */
export async function ensureOverlaySlug(orgId: string): Promise<string> {
	const existing = await db.query.settings.findFirst({
		where: and(eq(settings.orgId, orgId), eq(settings.key, 'overlaySlug'))
	});
	if (existing?.value) return existing.value;

	const clubName = await db.query.settings.findFirst({
		where: and(eq(settings.orgId, orgId), eq(settings.key, 'clubName'))
	});
	const orgSuffix = orgId.replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase();
	const base = slugify(clubName?.value ?? '');
	let slug = base || `org-${orgSuffix}`;
	if (await isSlugTaken(slug, orgId)) slug = `${base}-${orgSuffix}`;

	await db.insert(settings).values({ orgId, key: 'overlaySlug', value: slug }).onConflictDoNothing();
	return slug;
}
