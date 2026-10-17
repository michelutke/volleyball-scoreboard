import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { designTemplates } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { templateColorFields, applyTemplateToAllMatches } from '$lib/server/design-template.js';
import { designTemplateCreateSchema } from '$lib/server/validation.js';
import type { RequestHandler } from './$types.js';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const { orgId, isAdmin } = locals;
	if (!isAdmin) return json({ error: 'Forbidden' }, { status: 403 });

	const templateId = parseInt(params.templateId);
	const raw = await request.json();
	const parsed = designTemplateCreateSchema.partial().safeParse(raw);
	if (!parsed.success) return json({ error: 'Invalid input' }, { status: 400 });
	const body = parsed.data;

	const existing = await db.query.designTemplates.findFirst({
		where: and(eq(designTemplates.orgId, orgId), eq(designTemplates.id, templateId))
	});
	if (!existing) return json({ error: 'Template not found' }, { status: 404 });

	const updateData: Record<string, unknown> = { updatedAt: new Date() };
	if (body.name?.trim()) updateData.name = body.name.trim();

	for (const field of templateColorFields) {
		if (body[field] !== undefined) updateData[field] = body[field];
	}

	if (body.customCode !== undefined) updateData.customCode = body.customCode || null;
	if (body.isPublic !== undefined) updateData.isPublic = !!body.isPublic;
	if (body.description !== undefined) updateData.description = body.description || null;

	// Handle default toggle
	if (body.isDefault !== undefined) {
		if (body.isDefault && !existing.isDefault) {
			await db
				.update(designTemplates)
				.set({ isDefault: false })
				.where(and(eq(designTemplates.orgId, orgId), eq(designTemplates.isDefault, true)));
		}
		updateData.isDefault = body.isDefault;
	}

	const [updated] = await db
		.update(designTemplates)
		.set(updateData)
		.where(eq(designTemplates.id, templateId))
		.returning();

	// Propagate color changes to all matches using this template
	await applyTemplateToAllMatches(templateId);

	return json(updated);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const { orgId, isAdmin } = locals;
	if (!isAdmin) return json({ error: 'Forbidden' }, { status: 403 });

	const templateId = parseInt(params.templateId);

	const existing = await db.query.designTemplates.findFirst({
		where: and(eq(designTemplates.orgId, orgId), eq(designTemplates.id, templateId))
	});
	if (!existing) return json({ error: 'Template not found' }, { status: 404 });
	if (existing.isDefault) return json({ error: 'Cannot delete the default template' }, { status: 400 });

	await db.delete(designTemplates).where(eq(designTemplates.id, templateId));
	return json({ ok: true });
};
