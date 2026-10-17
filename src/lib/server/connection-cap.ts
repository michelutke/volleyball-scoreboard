const counts = new Map<string, number>();

export function acquireConnection(key: string, max: number): boolean {
	const current = counts.get(key) ?? 0;
	if (current >= max) return false;
	counts.set(key, current + 1);
	return true;
}

export function releaseConnection(key: string): void {
	const current = counts.get(key) ?? 0;
	if (current <= 1) counts.delete(key);
	else counts.set(key, current - 1);
}
