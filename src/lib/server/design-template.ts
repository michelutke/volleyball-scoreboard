import { db } from '$lib/server/db/index.js';
import { designTemplates, matches } from '$lib/server/db/schema.js';
import { and, eq } from 'drizzle-orm';

/** Fields that a design template controls on a match. */
export const templateColorFields = [
	'overlayBg', 'overlayBg2', 'overlayBgGradient',
	'overlayText', 'overlayRounded', 'overlayDivider',
	'overlaySatsBg', 'overlaySetScoreBg',
	'scoreColor', 'scoreColor2', 'scoreColorGradient'
] as const;

/** Extract color values from a template row into an object suitable for match update. */
export function templateToMatchColors(template: typeof designTemplates.$inferSelect) {
	return {
		overlayBg: template.overlayBg,
		overlayBg2: template.overlayBg2,
		overlayBgGradient: template.overlayBgGradient,
		overlayText: template.overlayText,
		overlayRounded: template.overlayRounded,
		overlayDivider: template.overlayDivider,
		overlaySatsBg: template.overlaySatsBg,
		overlaySetScoreBg: template.overlaySetScoreBg,
		scoreColor: template.scoreColor,
		scoreColor2: template.scoreColor2,
		scoreColorGradient: template.scoreColorGradient,
		designTemplateId: template.id
	};
}

/** Get the default design template for an org, or null if none exists. */
export async function getDefaultTemplate(orgId: string) {
	return db.query.designTemplates.findFirst({
		where: and(eq(designTemplates.orgId, orgId), eq(designTemplates.isDefault, true))
	});
}

/** Apply a template's colors to a single match. */
export async function applyTemplateToMatch(templateId: number, matchId: number) {
	const template = await db.query.designTemplates.findFirst({
		where: eq(designTemplates.id, templateId)
	});
	if (!template) return null;

	const colors = templateToMatchColors(template);
	const [updated] = await db
		.update(matches)
		.set({ ...colors, updatedAt: new Date() })
		.where(eq(matches.id, matchId))
		.returning();
	return updated;
}

/** Apply a template's colors to all matches using that template. */
export async function applyTemplateToAllMatches(templateId: number) {
	const template = await db.query.designTemplates.findFirst({
		where: eq(designTemplates.id, templateId)
	});
	if (!template) return;

	const colors = templateToMatchColors(template);
	await db
		.update(matches)
		.set({ ...colors, updatedAt: new Date() })
		.where(eq(matches.designTemplateId, templateId));
}
