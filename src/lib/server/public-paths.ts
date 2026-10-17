export const PUBLIC_PATHS = ['/', '/auth', '/api/health', '/signin', '/signout', '/signup', '/privacy', '/imprint', '/about', '/api/billing/webhook', '/api/auth/auto-login', '/library', '/api/overlay-sandbox', '/api/image-proxy'];

export function isPublicPath(path: string): boolean {
	return PUBLIC_PATHS.some((p) => (p === '/' ? path === '/' : path === p || path.startsWith(p + '/')));
}
