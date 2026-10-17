import { json } from '@sveltejs/kit';
import { removeFromOrg, deleteUser, listOrgMembers, assignAdminRole, revokeAdminRole, getKcOrgId } from '$lib/server/keycloak-admin.js';
import { userPatchSchema } from '$lib/server/validation.js';
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
		console.error('[users] delete failed:', err);
		return json({ error: 'Entfernen fehlgeschlagen' }, { status: 500 });
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

	const raw = await request.json();
	const parsed = userPatchSchema.safeParse(raw);
	if (!parsed.success) return json({ error: 'Invalid input' }, { status: 400 });
	const body = parsed.data;

	try {
		if (body.isAdmin) {
			await assignAdminRole(params.id);
		} else {
			await revokeAdminRole(params.id);
		}
	} catch (err) {
		console.error('[users] role change failed:', err);
		return json({ error: 'Rollenänderung fehlgeschlagen' }, { status: 500 });
	}

	return json({ ok: true });
};
