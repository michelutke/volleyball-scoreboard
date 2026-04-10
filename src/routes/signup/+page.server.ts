import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.auth();
	if (session?.user) redirect(302, '/dashboard');
};
import {
	getUserByEmail,
	getUserByUsername,
	createUser,
	createOrganization,
	deleteOrganization,
	addToOrg,
	assignAdminRole,
	setUserPassword,
	deleteUser
} from '$lib/server/keycloak-admin';
import { getStripe } from '$lib/server/stripe';
import { db } from '$lib/server/db';
import { settings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { isRateLimited } from '$lib/server/rate-limit';

export const actions: Actions = {
	default: async ({ request, getClientAddress, url }) => {
		if (isRateLimited(getClientAddress())) {
			return fail(429, { error: 'Zu viele Anfragen. Bitte versuche es später erneut.' });
		}

		const data = await request.formData();
		const email = (data.get('email') as string | null)?.trim();
		const firstName = (data.get('firstName') as string | null)?.trim();
		const lastName = (data.get('lastName') as string | null)?.trim();
		const username = (data.get('username') as string | null)?.trim().toLowerCase();
		const password = data.get('password') as string | null;
		const confirmPassword = data.get('confirmPassword') as string | null;

		if (!email || !firstName || !lastName || !username || !password || !confirmPassword) {
			return fail(400, { error: 'Alle Felder sind erforderlich' });
		}
		if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
			return fail(400, { error: 'Benutzername: 3–30 Zeichen, nur Buchstaben, Zahlen, ., _, -' });
		}
		if (password.length < 8) {
			return fail(400, { error: 'Passwort muss mindestens 8 Zeichen haben' });
		}
		if (password !== confirmPassword) {
			return fail(400, { error: 'Passwörter stimmen nicht überein' });
		}

		const existing = await getUserByEmail(email);
		if (existing) return fail(409, { error: 'E-Mail bereits registriert' });
		const existingUsername = await getUserByUsername(username);
		if (existingUsername) return fail(409, { error: 'Benutzername bereits vergeben' });

		let userId: string | null = null;
		let kcOrgId: string | null = null;
		let stripeCustomerId: string | null = null;

		try {
			userId = await createUser(email, { firstName, lastName, username });
			await setUserPassword(userId, password);
			const randomId = crypto.randomUUID().slice(0, 8).toUpperCase();
			const orgName = `${username}-${randomId}`;
			const orgAlias = orgName.toLowerCase();
			kcOrgId = await createOrganization(orgName);
			await addToOrg(userId, kcOrgId);
			await assignAdminRole(userId);

			const settingsRows: { orgId: string; key: string; value: string }[] = [
				{ orgId: kcOrgId, key: 'kcOrgId', value: kcOrgId },
				{ orgId: kcOrgId, key: 'overlaySlug', value: orgAlias }
			];

			if (env.STRIPE_SECRET_KEY) {
				const customer = await getStripe().customers.create({
					email,
					name: `${firstName} ${lastName}`,
					metadata: { orgId: kcOrgId }
				});
				stripeCustomerId = customer.id;
				settingsRows.push({ orgId: kcOrgId, key: 'stripeCustomerId', value: stripeCustomerId });
			}

			await db.insert(settings).values(settingsRows).onConflictDoNothing();

			if (env.STRIPE_SECRET_KEY && env.STRIPE_PRICE_ID && stripeCustomerId && kcOrgId) {
				const session = await getStripe().checkout.sessions.create({
					mode: 'subscription',
					line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
					customer: stripeCustomerId,
					metadata: { orgId: kcOrgId },
					subscription_data: {
						trial_period_days: 3,
						metadata: { orgId: kcOrgId }
					},
					payment_method_collection: 'always',
					ui_mode: 'embedded',
					redirect_on_completion: 'never'
				});
				return { clientSecret: session.client_secret, sessionId: session.id };
			}

			return { success: true };
		} catch (err) {
			console.error('[signup] provisioning failed, rolling back', err);
			// LIFO rollback: Stripe → KC org + DB settings → KC user
			if (stripeCustomerId) {
				try { await getStripe().customers.del(stripeCustomerId); } catch (e) { console.error('[signup] stripe cleanup failed', e); }
			}
			if (kcOrgId) {
				try { await deleteOrganization(kcOrgId); } catch (e) { console.error('[signup] KC org cleanup failed', e); }
				try { await db.delete(settings).where(eq(settings.orgId, kcOrgId)); } catch (e) { console.error('[signup] settings cleanup failed', e); }
			}
			if (userId) {
				try { await deleteUser(userId); } catch (e) { console.error('[signup] KC user cleanup failed', e); }
			}
			return fail(500, { error: 'Registrierung fehlgeschlagen. Bitte versuche es erneut.' });
		}
	}
};
