import { env } from '$env/dynamic/private';

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

async function apiFetch<T>(path: string): Promise<T> {
	const cached = getCached<T>(path);
	if (cached) return cached;

	const apiKey = env.SWISS_VOLLEY_API_KEY;
	if (!apiKey) throw new Error('SWISS_VOLLEY_API_KEY not configured');

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
	setCache(path, data);
	return data as T;
}

export async function getTeams(): Promise<SVTeam[]> {
	return apiFetch<SVTeam[]>('/indoor/teams');
}

export async function getUpcomingGames(): Promise<SVGame[]> {
	return apiFetch<SVGame[]>('/indoor/upcomingGames');
}
