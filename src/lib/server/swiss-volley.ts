import { env } from '$env/dynamic/private';

const BASE_URL = 'https://volleymanager.volleyball.ch/api';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
	data: T;
	timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
	const entry = cache.get(key);
	if (!entry) return null;
	if (Date.now() - entry.timestamp > CACHE_TTL) {
		cache.delete(key);
		return null;
	}
	return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
	cache.set(key, { data, timestamp: Date.now() });
}

export interface SwissVolleyTeam {
	id: string;
	name: string;
	clubName: string;
}

export interface SwissVolleyMatch {
	id: string;
	homeTeam: string;
	guestTeam: string;
	date: string;
	venue: string;
	league: string;
}

async function apiFetch<T>(path: string): Promise<T> {
	const cached = getCached<T>(path);
	if (cached) return cached;

	const apiKey = env.SWISS_VOLLEY_API_KEY;
	if (!apiKey) throw new Error('SWISS_VOLLEY_API_KEY not configured');

	const res = await fetch(`${BASE_URL}${path}`, {
		headers: {
			Authorization: `Bearer ${apiKey}`,
			Accept: 'application/json'
		}
	});

	if (!res.ok) {
		throw new Error(`Swiss Volley API error: ${res.status} ${res.statusText}`);
	}

	const data = await res.json();
	setCache(path, data);
	return data as T;
}

export async function getTeams(clubId: string): Promise<SwissVolleyTeam[]> {
	return apiFetch<SwissVolleyTeam[]>(`/clubs/${clubId}/teams`);
}

export async function getUpcomingMatches(teamId: string): Promise<SwissVolleyMatch[]> {
	return apiFetch<SwissVolleyMatch[]>(`/teams/${teamId}/matches?status=upcoming`);
}
