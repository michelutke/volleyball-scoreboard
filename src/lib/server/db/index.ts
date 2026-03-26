import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL environment variable is required');
const client = postgres(env.DATABASE_URL, { onnotice: () => {} });
export const db = drizzle(client, { schema });
