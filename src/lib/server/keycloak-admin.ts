import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { settings } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';

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
	return `${url}/admin/realms/${env.KEYCLOAK_REALM ?? 'master'}`;
}

function getTokenUrl(): string {
	const url = env.KEYCLOAK_ADMIN_URL;
	if (!url) throw new Error('KEYCLOAK_ADMIN_URL not configured');
	return `${url}/realms/${env.KEYCLOAK_REALM ?? 'master'}/protocol/openid-connect/token`;
}

export async function getAdminToken(): Promise<string> {
	if (tokenCache && Date.now() < tokenCache.expiresAt) {
		return tokenCache.token;
	}

	const secret = env.KEYCLOAK_ADMIN_CLIENT_SECRET;
	if (!secret) throw new Error('KEYCLOAK_ADMIN_CLIENT_SECRET not configured');
	const clientId = env.KEYCLOAK_ADMIN_CLIENT_ID;
	if (!clientId) throw new Error('KEYCLOAK_ADMIN_CLIENT_ID not configured');

	const res = await fetch(getTokenUrl(), {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'client_credentials',
			client_id: clientId,
			client_secret: secret
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

export async function createUser(
	email: string,
	opts?: { firstName?: string; lastName?: string }
): Promise<string> {
	const res = await kcFetch('/users', {
		method: 'POST',
		body: JSON.stringify({
			email,
			username: email,
			enabled: true,
			emailVerified: true,
			...(opts?.firstName ? { firstName: opts.firstName } : {}),
			...(opts?.lastName ? { lastName: opts.lastName } : {})
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

export async function createOrganization(name: string): Promise<string> {
	const alias = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
	const res = await kcFetch('/organizations', {
		method: 'POST',
		body: JSON.stringify({ name, alias, enabled: true })
	});
	if (!res.ok) throw new Error(`createOrganization ${res.status}: ${await kcErrorBody(res)}`);
	const location = res.headers.get('Location');
	if (!location) throw new Error('No Location header');
	return location.split('/').pop()!;
}

export async function deleteOrganization(kcOrgId: string): Promise<void> {
	const res = await kcFetch(`/organizations/${kcOrgId}`, { method: 'DELETE' });
	if (!res.ok && res.status !== 404) {
		throw new Error(`deleteOrganization ${res.status}: ${await kcErrorBody(res)}`);
	}
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

export async function listUsersWithRole(roleName: string): Promise<KcUser[]> {
	const res = await kcFetch(`/roles/${roleName}/users`);
	if (!res.ok) {
		return [];
	}
	return res.json() as Promise<KcUser[]>;
}

export async function revokeAdminRole(userId: string): Promise<void> {
	const rolesRes = await kcFetch('/roles/admin');
	if (!rolesRes.ok) throw new Error(`Failed to get admin role: ${rolesRes.status}`);
	const role: { id: string; name: string } = await rolesRes.json();
	const res = await kcFetch(`/users/${userId}/role-mappings/realm`, {
		method: 'DELETE',
		body: JSON.stringify([role])
	});
	if (!res.ok && res.status !== 404) throw new Error(`Failed to revoke admin role: ${res.status}`);
}

export async function setUserPassword(userId: string, password: string): Promise<void> {
	const res = await kcFetch(`/users/${userId}/reset-password`, {
		method: 'PUT',
		body: JSON.stringify({ type: 'password', temporary: false, value: password })
	});
	if (!res.ok) throw new Error(`KC setUserPassword failed: ${res.status}`);
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

export async function getKcOrgId(orgId: string): Promise<string | null> {
	const row = await db.query.settings.findFirst({
		where: and(eq(settings.orgId, orgId), eq(settings.key, 'kcOrgId'))
	});
	if (row?.value) return row.value;
	if (orgId === 'default') return null;
	const fallback = await db.query.settings.findFirst({
		where: and(eq(settings.orgId, 'default'), eq(settings.key, 'kcOrgId'))
	});
	return fallback?.value ?? null;
}

export async function bootstrapKcOrgId(): Promise<void> {
	if (!env.KEYCLOAK_ADMIN_URL || !env.KEYCLOAK_ADMIN_CLIENT_SECRET) return;
	const existing = await db.query.settings.findFirst({
		where: and(eq(settings.orgId, 'default'), eq(settings.key, 'kcOrgId'))
	});
	if (existing) return;
	try {
		const res = await kcFetch('/organizations');
		if (!res.ok) return;
		const orgs: { id: string; name: string }[] = await res.json();
		if (orgs.length === 0) return;
		await db.insert(settings).values({ orgId: 'default', key: 'kcOrgId', value: orgs[0].id })
			.onConflictDoNothing();
		console.log('[keycloak] kcOrgId auto-configured:', orgs[0].id);
	} catch (e) {
		console.warn('[keycloak] kcOrgId bootstrap failed (non-fatal):', e);
	}
}

async function getMasterAdminToken(): Promise<string | null> {
	if (!env.KEYCLOAK_ADMIN_URL) return null;
	try {
		const res = await fetch(`${env.KEYCLOAK_ADMIN_URL}/realms/master/protocol/openid-connect/token`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				grant_type: 'password',
				client_id: 'admin-cli',
				username: 'admin',
				password: env.KEYCLOAK_ADMIN_PASSWORD ?? 'admin'
			})
		});
		if (!res.ok) return null;
		const data: { access_token: string } = await res.json();
		return data.access_token;
	} catch {
		return null;
	}
}

export async function ensureOrganizationMapper(): Promise<void> {
	if (!env.KEYCLOAK_ADMIN_URL) return;
	try {
		const clientId = env.KEYCLOAK_CLIENT_ID ?? 'scoring-app';
		const realm = env.KEYCLOAK_REALM ?? 'master';
		const base = `${env.KEYCLOAK_ADMIN_URL}/admin/realms/${realm}`;

		// service account may lack manage-clients — try it first, fall back to master admin
		let authHeader: string | null = null;
		const saRes = await kcFetch(`/clients?clientId=${encodeURIComponent(clientId)}`);
		if (saRes.ok) {
			authHeader = `Bearer ${await getAdminToken()}`; // service account works
		} else {
			const masterToken = await getMasterAdminToken();
			if (!masterToken) {
				console.warn('[keycloak] ensureOrganizationMapper: no usable credentials');
				return;
			}
			authHeader = `Bearer ${masterToken}`;
		}

		const headers = { Authorization: authHeader, 'Content-Type': 'application/json' };

		// look up client UUID
		const clientsRes = await fetch(`${base}/clients?clientId=${encodeURIComponent(clientId)}`, { headers });
		if (!clientsRes.ok) { console.warn('[keycloak] ensureOrganizationMapper: clients lookup failed', clientsRes.status); return; }
		const clients: { id: string }[] = await clientsRes.json();
		if (clients.length === 0) return;
		const uuid = clients[0].id;

		const mappersUrl = `${base}/clients/${uuid}/protocol-mappers/models`;
		const mappersRes = await fetch(mappersUrl, { headers });
		if (!mappersRes.ok) { console.warn('[keycloak] ensureOrganizationMapper: mappers lookup failed', mappersRes.status); return; }
		const mappers: { id: string; name: string; protocolMapper: string; config: Record<string, string> }[] = await mappersRes.json();

		// delete hardcoded org_id mapper if present — it assigns a static org UUID to all users
		const hardcoded = mappers.find((m) => m.protocolMapper === 'oidc-hardcoded-claim-mapper' && m.name === 'org_id');
		if (hardcoded) {
			const delRes = await fetch(`${mappersUrl}/${hardcoded.id}`, { method: 'DELETE', headers });
			if (delRes.ok) console.log('[keycloak] deleted hardcoded org_id mapper');
			else console.warn('[keycloak] failed to delete hardcoded org_id mapper:', delRes.status);
		}

		// org ID must be in token — KC 26 uses addOrganizationId key
		const desiredConfig = {
			'access.token.claim': 'true',
			'id.token.claim': 'false',
			'lightweight.claim': 'false',
			'introspection.token.claim': 'true',
			'addOrganizationId': 'true'
		};

		const existing = mappers.find((m) => m.protocolMapper === 'oidc-organization-membership-mapper');
		if (existing) {
			if (existing.config?.['addOrganizationId'] === 'true') {
				console.log('[keycloak] organization mapper already configured correctly');
				return;
			}
			const updateRes = await fetch(`${mappersUrl}/${existing.id}`, {
				method: 'PUT', headers,
				body: JSON.stringify({ ...existing, config: { ...existing.config, ...desiredConfig } })
			});
			if (!updateRes.ok) console.warn('[keycloak] ensureOrganizationMapper update failed:', updateRes.status);
			else console.log('[keycloak] organization mapper updated to include org ID in token');
			return;
		}

		const addRes = await fetch(mappersUrl, {
			method: 'POST', headers,
			body: JSON.stringify({
				name: 'organization',
				protocol: 'openid-connect',
				protocolMapper: 'oidc-organization-membership-mapper',
				consentRequired: false,
				config: desiredConfig
			})
		});
		if (!addRes.ok) console.warn('[keycloak] ensureOrganizationMapper add failed:', addRes.status);
		else console.log('[keycloak] organization mapper ensured with org ID in token');
	} catch (e) {
		console.warn('[keycloak] ensureOrganizationMapper failed (non-fatal):', e);
	}
}

export async function ensureDirectAccessGrants(): Promise<void> {
	if (!env.KEYCLOAK_ADMIN_URL) return;
	try {
		const masterTokenRes = await fetch(`${env.KEYCLOAK_ADMIN_URL}/realms/master/protocol/openid-connect/token`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				grant_type: 'password',
				client_id: 'admin-cli',
				username: 'admin',
				password: env.KEYCLOAK_ADMIN_PASSWORD ?? 'admin'
			})
		});
		if (!masterTokenRes.ok) {
			const body = await masterTokenRes.text();
			console.warn('[keycloak] ensureDirectAccessGrants: master token failed:', masterTokenRes.status, body);
			return;
		}
		const { access_token } = await masterTokenRes.json() as { access_token: string };
		const realm = env.KEYCLOAK_REALM ?? 'master';
		const base = `${env.KEYCLOAK_ADMIN_URL}/admin/realms/${realm}`;
		const headers = { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' };
		const clientId = env.KEYCLOAK_CLIENT_ID ?? 'scoring-app';
		const searchRes = await fetch(`${base}/clients?clientId=${encodeURIComponent(clientId)}`, { headers });
		if (!searchRes.ok) return;
		const clients: { id: string; directAccessGrantsEnabled: boolean }[] = await searchRes.json();
		if (clients.length === 0) return;
		const client = clients[0];
		if (client.directAccessGrantsEnabled) {
			console.log('[keycloak] direct access grants already enabled');
			return;
		}
		const res = await fetch(`${base}/clients/${client.id}`, {
			method: 'PUT', headers,
			body: JSON.stringify({ ...client, directAccessGrantsEnabled: true })
		});
		if (!res.ok) {
			console.warn('[keycloak] ensureDirectAccessGrants failed:', res.status, await kcErrorBody(res));
			return;
		}
		console.log('[keycloak] direct access grants enabled');
	} catch (e) {
		console.warn('[keycloak] ensureDirectAccessGrants failed (non-fatal):', e);
	}
}

export async function getKcOrgIdForUser(userId: string): Promise<string | undefined> {
	const res = await kcFetch(`/users/${userId}/organizations`);
	if (!res.ok) {
		console.warn('[keycloak] getKcOrgIdForUser failed:', res.status, 'userId:', userId);
		return undefined;
	}
	const orgs: { id: string }[] = await res.json();
	if (!orgs[0]?.id) {
		console.warn('[keycloak] getKcOrgIdForUser: no orgs found for userId:', userId);
	}
	return orgs[0]?.id;
}

export async function syncClientRedirectUri(origin: string): Promise<void> {
	if (!env.KEYCLOAK_ADMIN_URL || !env.KEYCLOAK_ADMIN_CLIENT_SECRET) return;
	try {
		const clientId = env.KEYCLOAK_CLIENT_ID ?? 'scoring-app';
		const searchRes = await kcFetch(`/clients?clientId=${encodeURIComponent(clientId)}`);
		if (!searchRes.ok) return;
		const clients: { id: string; redirectUris: string[]; webOrigins: string[] }[] = await searchRes.json();
		if (clients.length === 0) return;
		const client = clients[0];
		const uri = `${origin}/*`;
		if (client.redirectUris.includes(uri)) return;
		await kcFetch(`/clients/${client.id}`, {
			method: 'PUT',
			body: JSON.stringify({
				...client,
				redirectUris: [...client.redirectUris, uri],
				webOrigins: client.webOrigins.includes(origin)
					? client.webOrigins
					: [...client.webOrigins, origin]
			})
		});
		console.log('[keycloak] redirect URI registered:', uri);
	} catch (e) {
		console.warn('[keycloak] syncClientRedirectUri failed (non-fatal):', e);
	}
}
