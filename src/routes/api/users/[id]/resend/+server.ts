import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { resendInvite, getKcOrgId, listOrgMembers } from '$lib/server/keycloak-admin.js';
import { isUuid } from '$lib/server/validation.js';

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.isAdmin) {
		return json({ error: 'Nicht autorisiert' }, { status: 403 });
	}
	if (!isUuid(params.id)) {
		return json({ error: 'Ungültige Nutzer-ID' }, { status: 400 });
	}

	const kcOrgId = await getKcOrgId(locals.orgId);
	if (!kcOrgId) {
		return json({ error: 'Organisation nicht konfiguriert' }, { status: 400 });
	}

	try {
		const members = await listOrgMembers(kcOrgId);
		if (!members.some((m) => m.id === params.id)) {
			return json({ error: 'Nutzer nicht gefunden' }, { status: 404 });
		}
		await resendInvite(params.id, kcOrgId);
		return json({ success: true });
	} catch (err) {
		console.error('resendInvite failed:', err);
		return json({ error: 'Einladung konnte nicht erneut gesendet werden' }, { status: 500 });
	}
};
