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
import { stripe } from '$lib/server/stripe';
import { db } from '$lib/server/db';
import { settings } from '$lib/server/db/schema';
import { env } from '$env/dynamic/private';
import { isRateLimited } from '$lib/server/rate-limit';

export const actions: Actions = {
	default: async ({ request, getClientAddress }) => {
		if (!env.STRIPE_SECRET_KEY) return fail(404, { error: 'Not found' });

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
			await sendSetPasswordEmail(userId);

			const customer = await stripe.customers.create({
				email,
				name: `${firstName} ${lastName}`,
				metadata: { orgId: kcOrgId }
			});
			stripeCustomerId = customer.id;

			await db.insert(settings).values([
				{ orgId: kcOrgId, key: 'kcOrgId', value: kcOrgId },
				{ orgId: kcOrgId, key: 'trialStartedAt', value: new Date().toISOString() },
				{ orgId: kcOrgId, key: 'stripeCustomerId', value: stripeCustomerId },
				{ orgId: kcOrgId, key: 'subscriptionStatus', value: 'trialing' }
			]).onConflictDoNothing();

			return { success: true };
		} catch (err) {
			console.error('[signup] provisioning failed, rolling back', err);
			// LIFO rollback: Stripe → KC org → KC user
			if (stripeCustomerId) {
				try { await stripe.customers.del(stripeCustomerId); } catch (e) { console.error('[signup] stripe cleanup failed', e); }
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
