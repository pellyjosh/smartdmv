// src/owner/db/migrate.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const ownerDbUrl = process.env.OWNER_DATABASE_URL || process.env.DATABASE_URL;

if (!ownerDbUrl) {
  throw new Error('OWNER_DATABASE_URL or DATABASE_URL environment variable is required');
}

const sql = postgres(ownerDbUrl, { max: 1 });
const db = drizzle(sql);

async function runMigrations() {
  try {
    console.log('Running owner database migrations...');
    await migrate(db, { migrationsFolder: './src/owner/db/migrations' });
    console.log('Owner database migrations completed successfully');
  } catch (error) {
    console.error('Failed to run owner database migrations:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigrations();
