import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import {
	getUserByEmail,
	createUser,
	createOrganization,
	deleteOrganization,
	addToOrg,
	assignAdminRole,
	sendSetPasswordEmail,
	deleteUser
} from '$lib/server/keycloak-admin';
import { getStripe } from '$lib/server/stripe';
import { db } from '$lib/server/db';
import { settings } from '$lib/server/db/schema';
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

		if (!email || !firstName || !lastName) {
			return fail(400, { error: 'Alle Felder sind erforderlich' });
		}

		const existing = await getUserByEmail(email);
		if (existing) return fail(409, { error: 'E-Mail bereits registriert' });

		let userId: string | null = null;
		let kcOrgId: string | null = null;
		let stripeCustomerId: string | null = null;

		try {
			userId = await createUser(email, { firstName, lastName });
			kcOrgId = await createOrganization(`${firstName}'s Club`);
			await addToOrg(userId, kcOrgId);
			await assignAdminRole(userId);
			try {
				await sendSetPasswordEmail(userId);
			} catch (e) {
				console.warn('[signup] sendSetPasswordEmail failed (SMTP not configured?):', e);
			}

			const settingsRows: { orgId: string; key: string; value: string }[] = [
				{ orgId: kcOrgId, key: 'kcOrgId', value: kcOrgId }
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
					success_url: `${url.origin}/signin`,
					cancel_url: `${url.origin}/signin`
				});
				return { checkoutUrl: session.url };
			}

			return { success: true };
		} catch (err) {
			console.error('[signup] provisioning failed, rolling back', err);
			// LIFO rollback: Stripe → KC org → KC user
			if (stripeCustomerId) {
				try { await getStripe().customers.del(stripeCustomerId); } catch (e) { console.error('[signup] stripe cleanup failed', e); }
			}
			if (kcOrgId) {
				try { await deleteOrganization(kcOrgId); } catch (e) { console.error('[signup] KC org cleanup failed', e); }
			}
			if (userId) {
				try { await deleteUser(userId); } catch (e) { console.error('[signup] KC user cleanup failed', e); }
			}
			return fail(500, { error: 'Registrierung fehlgeschlagen. Bitte versuche es erneut.' });
		}
	}
};
