import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { resendInvite, getKcOrgId } from '$lib/server/keycloak-admin.js';

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.isAdmin) {
		return json({ error: 'Nicht autorisiert' }, { status: 403 });
	}

	const kcOrgId = await getKcOrgId(locals.orgId);
	if (!kcOrgId) {
		return json({ error: 'Organisation nicht konfiguriert' }, { status: 400 });
	}

	try {
		await resendInvite(params.id, kcOrgId);
		return json({ success: true });
	} catch (err) {
		console.error('resendInvite failed:', err);
		return json({ error: 'Einladung konnte nicht erneut gesendet werden' }, { status: 500 });
	}
};
