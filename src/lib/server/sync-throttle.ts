const lastSync = new Map<string, number>();
const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function shouldSync(key: string): boolean {
	const last = lastSync.get(key) ?? 0;
	if (Date.now() - last < INTERVAL_MS) return false;
	lastSync.set(key, Date.now());
	return true;
}
