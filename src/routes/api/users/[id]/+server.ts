import { json } from '@sveltejs/kit';
import { removeFromOrg, deleteUser, listOrgMembers, getKcOrgId } from '$lib/server/keycloak-admin.js';
import type { RequestHandler } from './$types.js';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.isAdmin) return json({ error: 'Forbidden' }, { status: 403 });

	const kcOrgId = await getKcOrgId(locals.orgId);
	if (!kcOrgId) return json({ error: 'Organisation nicht konfiguriert' }, { status: 400 });

	const sessionEmail = locals.session?.user?.email;
	if (sessionEmail) {
		const members = await listOrgMembers(kcOrgId);
		const target = members.find((m) => m.id === params.id);
		if (target?.email === sessionEmail) {
			return json({ error: 'Eigenes Konto kann nicht entfernt werden' }, { status: 400 });
		}
	}

	try {
		await removeFromOrg(params.id, kcOrgId);
		await deleteUser(params.id);
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Entfernen fehlgeschlagen';
		return json({ error: msg }, { status: 500 });
	}

	return json({ ok: true });
};
