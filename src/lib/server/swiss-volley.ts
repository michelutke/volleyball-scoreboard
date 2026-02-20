import { db } from '$lib/server/db/index.js';
import { settings } from '$lib/server/db/schema.js';
import { decrypt } from '$lib/server/crypto.js';
import { and, eq } from 'drizzle-orm';

const BASE_URL = 'https://api.volleyball.ch';
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

async function getApiKey(orgId: string): Promise<string> {
	const row = await db
		.select()
		.from(settings)
		.where(and(eq(settings.orgId, orgId), eq(settings.key, 'swissVolleyApiKey')))
		.limit(1);
	if (!row[0]) throw new Error('Swiss Volley API key not configured');
	return decrypt(row[0].value);
}

export interface SVTeam {
	teamId: number;
	seasonalTeamId: number;
	caption: string;
	gender: string;
	league: { leagueId: number; caption: string };
	club: { clubId: number; clubCaption: string };
}

export interface SVGameTeam {
	teamId: number;
	seasonalTeamId: number;
	caption: string;
	clubId: number;
	clubCaption: string;
	logo: string | null;
}

export interface SVGame {
	gameId: number;
	playDate: string;
	playDateUtc: string;
	gender: string;
	status: number;
	teams: { home: SVGameTeam; away: SVGameTeam };
	league: { leagueId: number; caption: string; season: number };
	hall: {
		hallId: number;
		caption: string;
		street: string;
		number: string;
		zip: number;
		city: string;
	} | null;
	setResults: unknown[];
	resultSummary: unknown[];
}

async function apiFetch<T>(path: string, orgId: string): Promise<T> {
	const cacheKey = `${orgId}:${path}`;
	const cached = getCached<T>(cacheKey);
	if (cached) return cached;

	const apiKey = await getApiKey(orgId);

	const res = await fetch(`${BASE_URL}${path}`, {
		headers: {
			Authorization: apiKey,
			Accept: 'application/json'
		}
	});

	if (!res.ok) {
		throw new Error(`Swiss Volley API error: ${res.status} ${res.statusText}`);
	}

	const data = await res.json();
	setCache(cacheKey, data);
	return data as T;
}

export async function getTeams(orgId: string): Promise<SVTeam[]> {
	return apiFetch<SVTeam[]>('/indoor/teams', orgId);
}

export async function getUpcomingGames(orgId: string): Promise<SVGame[]> {
	return apiFetch<SVGame[]>('/indoor/upcomingGames', orgId);
}
