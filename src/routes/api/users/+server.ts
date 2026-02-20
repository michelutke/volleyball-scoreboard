import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { settings } from '$lib/server/db/schema.js';
import { and, eq } from 'drizzle-orm';
import { listOrgMembers, createUser, addToOrg, sendSetPasswordEmail, disableUser } from '$lib/server/keycloak-admin.js';
import type { RequestHandler } from './$types.js';

async function getKcOrgId(orgId: string): Promise<string | null> {
	const row = await db.query.settings.findFirst({
		where: and(eq(settings.orgId, orgId), eq(settings.key, 'kcOrgId'))
	});
	if (row?.value) return row.value;
	if (orgId === 'default') return null;
	// fallback: try 'default' org (single-tenant self-hosted)
	const fallback = await db.query.settings.findFirst({
		where: and(eq(settings.orgId, 'default'), eq(settings.key, 'kcOrgId'))
	});
	return fallback?.value ?? null;
}

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.isAdmin) return json({ error: 'Forbidden' }, { status: 403 });

	const kcOrgId = await getKcOrgId(locals.orgId);
	if (!kcOrgId) return json([]);

	const members = await listOrgMembers(kcOrgId);
	return json(members.map((u) => ({ id: u.id, email: u.email, enabled: u.enabled })));
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.isAdmin) return json({ error: 'Forbidden' }, { status: 403 });

	const kcOrgId = await getKcOrgId(locals.orgId);
	if (!kcOrgId) return json({ error: 'Organisation nicht konfiguriert' }, { status: 400 });

	const body: { email?: string } = await request.json();
	if (!body.email?.trim()) return json({ error: 'E-Mail erforderlich' }, { status: 400 });

	let userId: string;
	try {
		userId = await createUser(body.email.trim());
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Nutzer konnte nicht erstellt werden';
		const isConflict = msg.includes('already exists');
		return json({ error: isConflict ? 'E-Mail bereits registriert' : msg }, { status: isConflict ? 409 : 500 });
	}

	try {
		await addToOrg(userId, kcOrgId);
	} catch (err) {
		await disableUser(userId).catch(() => {});
		const msg = err instanceof Error ? err.message : 'Einladung fehlgeschlagen';
		return json({ error: msg }, { status: 500 });
	}

	let emailSent = true;
	try {
		await sendSetPasswordEmail(userId);
	} catch (err) {
		const msg = err instanceof Error ? err.message : '';
		if (msg.includes('No sender address')) {
			console.warn(`SMTP not configured — skipping set-password email for ${body.email.trim()}`);
			emailSent = false;
		} else {
			return json({ error: msg || 'E-Mail konnte nicht gesendet werden' }, { status: 500 });
		}
	}

	return json({ id: userId, email: body.email.trim(), emailSent }, { status: 201 });
};
