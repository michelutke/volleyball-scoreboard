import { db } from '$lib/server/db/index.js';
import { designTemplates, matches } from '$lib/server/db/schema.js';
import { buildSandboxHtml, sandboxResponse } from '$lib/server/overlay-sandbox.js';
import { eq } from 'drizzle-orm';
import type { RequestEvent, RequestHandler } from './$types.js';

type Template = typeof designTemplates.$inferSelect;

/**
 * Public templates are open. Private ones are visible to their own org, and to anyone loading
 * the public overlay of a match that uses the template (OBS and the app have no session).
 * This route is a public path, so hooks do not resolve the session; do it here.
 */
async function canView(template: Template, { url, locals }: RequestEvent): Promise<boolean> {
	if (template.isPublic) return true;
	const session = locals.session ?? (await locals.auth());
	if (!session?.error && session?.user?.orgId && session.user.orgId === template.orgId) return true;

	const matchId = parseInt(url.searchParams.get('match') ?? '');
	if (isNaN(matchId)) return false;
	const match = await db.query.matches.findFirst({ where: eq(matches.id, matchId) });
	return match?.designTemplateId === template.id && match.orgId === template.orgId;
}

export const GET: RequestHandler = async (event) => {
	const templateId = parseInt(event.params.templateId);
	if (isNaN(templateId)) return new Response('Not found', { status: 404 });

	const template = await db.query.designTemplates.findFirst({
		where: eq(designTemplates.id, templateId)
	});
	if (!template?.customCode || !(await canView(template, event))) {
		return new Response('Not found', { status: 404 });
	}

	const preview = event.url.searchParams.has('preview');
	return sandboxResponse(buildSandboxHtml(template.customCode, template, preview));
};
