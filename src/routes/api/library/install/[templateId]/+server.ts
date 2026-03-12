import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { designTemplates } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ params, locals }) => {
	const { orgId } = locals;
	if (!orgId) return json({ error: 'Unauthorized' }, { status: 401 });

	const templateId = parseInt(params.templateId);
	if (isNaN(templateId)) return json({ error: 'Invalid template' }, { status: 400 });

	const source = await db.query.designTemplates.findFirst({
		where: eq(designTemplates.id, templateId)
	});

	if (!source || !source.isPublic || !source.customCode) {
		return json({ error: 'Template not found' }, { status: 404 });
	}

	const [forked] = await db
		.insert(designTemplates)
		.values({
			orgId,
			name: source.name,
			isDefault: false,
			isPublic: false,
			description: source.description,
			overlayBg: source.overlayBg,
			overlayBg2: source.overlayBg2,
			overlayBgGradient: source.overlayBgGradient,
			overlayText: source.overlayText,
			overlayRounded: source.overlayRounded,
			overlayDivider: source.overlayDivider,
			overlaySatsBg: source.overlaySatsBg,
			overlaySetScoreBg: source.overlaySetScoreBg,
			scoreColor: source.scoreColor,
			scoreColor2: source.scoreColor2,
			scoreColorGradient: source.scoreColorGradient,
			customCode: source.customCode
		})
		.returning();

	return json(forked, { status: 201 });
};
