import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

let _stripe: Stripe | null = null;

export function isStripeEnabled(): boolean {
	return !!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.STRIPE_PRICE_ID);
}

export function getStripe(): Stripe {
	if (!env.STRIPE_SECRET_KEY) throw new Error('Stripe not configured: STRIPE_SECRET_KEY missing');
	if (!_stripe) {
		_stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2026-02-25.clover' });
	}
	return _stripe;
}
