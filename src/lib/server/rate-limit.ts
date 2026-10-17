const DEFAULT_WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_MAX_ATTEMPTS = 5;
const CLEANUP_INTERVAL = 5 * 60 * 1000;

const buckets = new Map<string, { count: number; resetAt: number }>();

let lastCleanup = Date.now();

function cleanup(): void {
	const now = Date.now();
	if (now - lastCleanup < CLEANUP_INTERVAL) return;
	lastCleanup = now;
	for (const [key, bucket] of buckets) {
		if (now >= bucket.resetAt) buckets.delete(key);
	}
}

export function isRateLimited(
	key: string,
	opts?: { maxAttempts?: number; windowMs?: number }
): boolean {
	cleanup();
	const maxAttempts = opts?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
	const windowMs = opts?.windowMs ?? DEFAULT_WINDOW_MS;
	const now = Date.now();
	const bucket = buckets.get(key);

	if (!bucket || now >= bucket.resetAt) {
		buckets.set(key, { count: 1, resetAt: now + windowMs });
		return false;
	}

	if (bucket.count >= maxAttempts) return true;

	bucket.count++;
	return false;
}
