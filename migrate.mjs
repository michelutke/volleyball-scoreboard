import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

await migrate(db, { migrationsFolder: 'drizzle' });
console.log('[db] migrations applied');
await client.end();
