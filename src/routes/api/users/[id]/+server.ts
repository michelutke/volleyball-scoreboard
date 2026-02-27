import { json } from '@sveltejs/kit';
import { removeFromOrg, deleteUser, listOrgMembers, assignAdminRole, revokeAdminRole, getKcOrgId } from '$lib/server/keycloak-admin.js';
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

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.isAdmin) return json({ error: 'Forbidden' }, { status: 403 });

	const kcOrgId = await getKcOrgId(locals.orgId);
	if (!kcOrgId) return json({ error: 'Organisation nicht konfiguriert' }, { status: 400 });

	const members = await listOrgMembers(kcOrgId);
	const target = members.find((m) => m.id === params.id);
	const sessionEmail = locals.session?.user?.email;
	if (target?.email === sessionEmail) {
		return json({ error: 'Eigene Rolle kann nicht geändert werden' }, { status: 400 });
	}

	const body: { isAdmin?: boolean } = await request.json();
	if (typeof body.isAdmin !== 'boolean') return json({ error: 'isAdmin required' }, { status: 400 });

	try {
		if (body.isAdmin) {
			await assignAdminRole(params.id);
		} else {
			await revokeAdminRole(params.id);
		}
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Rollenänderung fehlgeschlagen';
		return json({ error: msg }, { status: 500 });
	}

	return json({ ok: true });
};
