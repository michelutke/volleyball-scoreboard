import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getStripe } from '$lib/server/stripe.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.auth();
	if (session) redirect(302, '/dashboard');

	let price: { amount: number; currency: string } | null = null;
	if (env.STRIPE_SECRET_KEY) {
		try {
			const stripe = getStripe();
			const prices = await stripe.prices.list({ active: true, limit: 1 });
			if (prices.data[0]?.unit_amount) {
				price = {
					amount: prices.data[0].unit_amount / 100,
					currency: prices.data[0].currency.toUpperCase()
				};
			}
		} catch {
			// Stripe unavailable — show fallback price
		}
	}

	return { price };
};
