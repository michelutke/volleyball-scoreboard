import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SessionOrgMismatchError, verifyAndActivateSession } from '$lib/server/billing';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!env.STRIPE_SECRET_KEY) return json({ ok: false });

	const { sessionId } = await request.json();
	if (!sessionId || typeof sessionId !== 'string') return json({ ok: false });

	try {
		const ok = await verifyAndActivateSession(sessionId, locals.orgId);
		return json({ ok });
	} catch (e) {
		if (e instanceof SessionOrgMismatchError) throw error(403, 'Forbidden');
		throw e;
	}
};
