import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { designTemplates } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { templateColorFields } from '$lib/server/design-template.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ locals }) => {
	const { orgId } = locals;
	const templates = await db.query.designTemplates.findMany({
		where: eq(designTemplates.orgId, orgId),
		orderBy: designTemplates.createdAt
	});
	return json(templates);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const { orgId, isAdmin } = locals;
	if (!isAdmin) return json({ error: 'Forbidden' }, { status: 403 });

	const body = await request.json();
	if (!body.name?.trim()) return json({ error: 'Name is required' }, { status: 400 });

	const values: Record<string, unknown> = {
		orgId,
		name: body.name.trim(),
		isDefault: body.isDefault ?? false
	};

	for (const field of templateColorFields) {
		if (body[field] !== undefined) values[field] = body[field];
	}

	if (body.customCode !== undefined) values.customCode = body.customCode || null;
	if (body.isPublic !== undefined) values.isPublic = !!body.isPublic;
	if (body.description !== undefined) values.description = body.description || null;

	// If setting as default, unset existing default first
	if (values.isDefault) {
		await db
			.update(designTemplates)
			.set({ isDefault: false })
			.where(and(eq(designTemplates.orgId, orgId), eq(designTemplates.isDefault, true)));
	}

	const [template] = await db
		.insert(designTemplates)
		.values(values as typeof designTemplates.$inferInsert)
		.returning();

	return json(template, { status: 201 });
};
