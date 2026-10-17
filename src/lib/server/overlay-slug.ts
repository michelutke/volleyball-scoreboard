import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { settings } from '$lib/server/db/schema.js';

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])$/;
const MAX_BASE_LENGTH = 48;

export function slugify(input: string): string {
	return input
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

export function isValidSlug(slug: string): boolean {
	return SLUG_PATTERN.test(slug);
}

export async function isSlugTaken(slug: string, orgId: string): Promise<boolean> {
	const row = await db.query.settings.findFirst({
		where: and(eq(settings.key, 'overlaySlug'), eq(settings.value, slug))
	});
	return !!row && row.orgId !== orgId;
}

function randomSuffix(): string {
	return crypto.randomUUID().replace(/-/g, '').slice(0, 6);
}

/**
 * Returns a valid, currently unused slug derived from `input`. Falls back to an org-derived
 * suffix, then to random suffixes, if the plain slug is invalid or taken by another org.
 */
export async function pickFreeSlug(input: string, orgId: string): Promise<string> {
	const orgSuffix = orgId.replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase();
	const base = slugify(input).slice(0, MAX_BASE_LENGTH).replace(/-$/, '');
	const candidates = base ? [base, `${base}-${orgSuffix}`] : [`org-${orgSuffix}`];

	for (const candidate of candidates) {
		if (isValidSlug(candidate) && !(await isSlugTaken(candidate, orgId))) return candidate;
	}

	for (let attempt = 0; attempt < 5; attempt++) {
		const candidate = `${base || 'org'}-${randomSuffix()}`;
		if (!(await isSlugTaken(candidate, orgId))) return candidate;
	}
	return `${base || 'org'}-${crypto.randomUUID().replace(/-/g, '')}`.slice(0, 64);
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
	const slug = await pickFreeSlug(clubName?.value ?? '', orgId);

	await db.insert(settings).values({ orgId, key: 'overlaySlug', value: slug }).onConflictDoNothing();
	return slug;
}
