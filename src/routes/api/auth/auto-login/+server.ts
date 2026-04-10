import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { serverCredentialsSignIn } from '../../../../auth';
import { verifyAndActivateSession } from '$lib/server/billing';
import { env } from '$env/dynamic/private';
import { isRateLimited } from '$lib/server/rate-limit.js';

export const POST: RequestHandler = async (event) => {
	if (isRateLimited(`auto-login:${event.getClientAddress()}`, { maxAttempts: 5, windowMs: 15 * 60 * 1000 })) {
		return json({ ok: false, error: 'Too many attempts' }, { status: 429 });
	}

	const { email, password, sessionId } = (await event.request.json()) as {
		email: string;
		password: string;
		sessionId: string;
	};

	if (!email || !password || !sessionId) {
		return json({ ok: false, redirectUrl: '/signin?registered=1' }, { status: 400 });
	}

	// Verify Stripe session + activate billing (non-fatal — webhook will also set status)
	if (env.STRIPE_SECRET_KEY) {
		try {
			await verifyAndActivateSession(sessionId);
		} catch (e) {
			console.error('[auto-login] stripe verify failed:', e);
		}
	}

	// Clear any existing session before signing in as the new user
	for (const name of ['authjs.session-token', 'authjs.callback-url', 'authjs.csrf-token']) {
		event.cookies.delete(name, { path: '/' });
		event.cookies.delete(`__Secure-${name}`, { path: '/' });
		event.cookies.delete(`__Host-${name}`, { path: '/' });
	}

	const result = await serverCredentialsSignIn(event, email, password, '/dashboard');
	return json(result);
};
