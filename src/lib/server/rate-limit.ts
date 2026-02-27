const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_ATTEMPTS = 5;

const buckets = new Map<string, { count: number; resetAt: number }>();

/** Returns true if the key has exceeded the rate limit. */
export function isRateLimited(key: string): boolean {
	const now = Date.now();
	const bucket = buckets.get(key);

	if (!bucket || now >= bucket.resetAt) {
		buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
		return false;
	}

	if (bucket.count >= MAX_ATTEMPTS) return true;

	bucket.count++;
	return false;
}
