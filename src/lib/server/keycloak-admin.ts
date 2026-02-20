import { env } from '$env/dynamic/private';

export interface KcUser {
	id: string;
	email: string;
	firstName?: string;
	lastName?: string;
	enabled: boolean;
}

let tokenCache: { token: string; expiresAt: number } | null = null;

function getBaseUrl(): string {
	const url = env.KEYCLOAK_ADMIN_URL;
	if (!url) throw new Error('KEYCLOAK_ADMIN_URL not configured');
	return `${url}/admin/realms/${env.KEYCLOAK_REALM ?? 'scoring'}`;
}

function getTokenUrl(): string {
	const url = env.KEYCLOAK_ADMIN_URL;
	if (!url) throw new Error('KEYCLOAK_ADMIN_URL not configured');
	return `${url}/realms/${env.KEYCLOAK_REALM ?? 'scoring'}/protocol/openid-connect/token`;
}

export async function getAdminToken(): Promise<string> {
	if (tokenCache && Date.now() < tokenCache.expiresAt) {
		return tokenCache.token;
	}

	const res = await fetch(getTokenUrl(), {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'client_credentials',
			client_id: env.KEYCLOAK_ADMIN_CLIENT_ID ?? 'scoring-admin',
			client_secret: (() => {
			const s = env.KEYCLOAK_ADMIN_CLIENT_SECRET;
			if (!s) throw new Error('KEYCLOAK_ADMIN_CLIENT_SECRET not configured');
			return s;
		})()
		})
	});

	if (!res.ok) {
		throw new Error(`Failed to get admin token: ${res.status} ${res.statusText}`);
	}

	const data: { access_token: string; expires_in: number } = await res.json();
	tokenCache = {
		token: data.access_token,
		expiresAt: Date.now() + (data.expires_in - 600) * 1000 // 10min buffer
	};
	return tokenCache.token;
}

async function kcErrorBody(res: Response): Promise<string> {
	try { return await res.text(); } catch { return ''; }
}

async function kcFetch(path: string, init?: RequestInit): Promise<Response> {
	const token = await getAdminToken();
	return fetch(`${getBaseUrl()}${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
			...init?.headers
		}
	});
}

export async function listOrgMembers(kcOrgId: string): Promise<KcUser[]> {
	const res = await kcFetch(`/organizations/${kcOrgId}/members`);
	if (!res.ok) {
		throw new Error(`Failed to list org members: ${res.status}`);
	}
	const users: KcUser[] = await res.json();
	return users.map((u) => ({
		id: u.id,
		email: u.email,
		firstName: u.firstName,
		lastName: u.lastName,
		enabled: u.enabled
	}));
}

export async function getUserByEmail(email: string): Promise<KcUser | null> {
	const res = await kcFetch(`/users?email=${encodeURIComponent(email)}&exact=true`);
	if (!res.ok) throw new Error(`getUserByEmail ${res.status}: ${await kcErrorBody(res)}`);
	const users: KcUser[] = await res.json();
	return users[0] ?? null;
}

export async function createUser(email: string): Promise<string> {
	const res = await kcFetch('/users', {
		method: 'POST',
		body: JSON.stringify({
			email,
			username: email,
			enabled: true,
			emailVerified: true
		})
	});

	if (res.status === 409) {
		const existing = await getUserByEmail(email);
		if (existing) return existing.id;
		throw new Error('User with this email already exists');
	}
	if (!res.ok) {
		throw new Error(`createUser ${res.status}: ${await kcErrorBody(res)}`);
	}

	const location = res.headers.get('Location');
	if (!location) throw new Error('No Location header in create user response');
	return location.split('/').pop()!;
}

export async function addToOrg(userId: string, kcOrgId: string): Promise<void> {
	const res = await kcFetch(`/organizations/${kcOrgId}/members`, {
		method: 'POST',
		body: JSON.stringify(userId)
	});
	if (!res.ok && res.status !== 409) {
		throw new Error(`addToOrg ${res.status}: ${await kcErrorBody(res)}`);
	}
}

export async function assignAdminRole(userId: string): Promise<void> {
	const rolesRes = await kcFetch('/roles/admin');
	if (!rolesRes.ok) {
		throw new Error(`Failed to get admin role: ${rolesRes.status}`);
	}
	const role: { id: string; name: string } = await rolesRes.json();

	const res = await kcFetch(`/users/${userId}/role-mappings/realm`, {
		method: 'POST',
		body: JSON.stringify([role])
	});
	if (!res.ok) {
		throw new Error(`Failed to assign admin role: ${res.status}`);
	}
}

export async function sendSetPasswordEmail(userId: string): Promise<void> {
	const res = await kcFetch(`/users/${userId}/execute-actions-email`, {
		method: 'PUT',
		body: JSON.stringify(['UPDATE_PASSWORD'])
	});
	if (!res.ok) {
		throw new Error(`sendSetPasswordEmail ${res.status}: ${await kcErrorBody(res)}`);
	}
}

export async function removeFromOrg(userId: string, kcOrgId: string): Promise<void> {
	const res = await kcFetch(`/organizations/${kcOrgId}/members/${userId}`, {
		method: 'DELETE'
	});
	if (!res.ok && res.status !== 404) {
		throw new Error(`Failed to remove user from org: ${res.status}`);
	}
}

export async function deleteUser(userId: string): Promise<void> {
	const res = await kcFetch(`/users/${userId}`, { method: 'DELETE' });
	if (!res.ok && res.status !== 404) {
		throw new Error(`deleteUser ${res.status}: ${await kcErrorBody(res)}`);
	}
}

export async function disableUser(userId: string): Promise<void> {
	const res = await kcFetch(`/users/${userId}`, {
		method: 'PUT',
		body: JSON.stringify({ enabled: false })
	});
	if (!res.ok && res.status !== 404) {
		throw new Error(`disableUser ${res.status}: ${await kcErrorBody(res)}`);
	}
}
