
import { config } from 'dotenv';
config(); // Load environment variables at the very top

// index.ts
import { drizzle as drizzlePostgres } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { Pool } from 'pg';
import Database from 'better-sqlite3';
import * as schema from './schema';

// ✅ Extend globalThis for custom caching variables
declare global {
  // biome-ignore lint/style/noVar: This is needed for global declarations
  var DrizzlePostgresClient: Pool | undefined;
  var DrizzleSqliteClient: ReturnType<typeof Database> | undefined;
}

// ✅ Ensure this file is treated as a module
export {};

let dbInstance: ReturnType<typeof drizzlePostgres> | ReturnType<typeof drizzleSqlite>;

const dbType = process.env.DB_TYPE || 'postgres'; // Default to PostgreSQL
console.log(`[DB_INIT] DB_TYPE set to: ${dbType}`);


if (dbType === 'postgres') {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL environment variable is not set for DB_TYPE="postgres".');
  }

  console.log('🔌 Connecting to PostgreSQL database...');

  let poolClient: Pool;
  if (process.env.NODE_ENV === 'production') {
    poolClient = new Pool({ connectionString: process.env.POSTGRES_URL });
  } else {
    if (!global.DrizzlePostgresClient) {
      global.DrizzlePostgresClient = new Pool({ connectionString: process.env.POSTGRES_URL });
      console.log('[DB_INIT] New PostgreSQL global client created for development.');
    } else {
      console.log('[DB_INIT] Reusing existing PostgreSQL global client for development.');
    }
    poolClient = global.DrizzlePostgresClient;
  }

  dbInstance = drizzlePostgres(poolClient, {
    schema,
    logger: process.env.NODE_ENV === 'development',
  });
  console.log('✅ PostgreSQL Drizzle instance created.');

} else if (dbType === 'sqlite') {
  if (!process.env.SQLITE_DB_PATH) {
    throw new Error('SQLITE_DB_PATH environment variable is not set for DB_TYPE="sqlite".');
  }

  console.log(`🔌 Connecting to SQLite database at: ${process.env.SQLITE_DB_PATH}`);

  let sqliteClient: ReturnType<typeof Database>;

  if (process.env.NODE_ENV === 'production') {
    sqliteClient = new Database(process.env.SQLITE_DB_PATH);
  } else {
    if (!global.DrizzleSqliteClient) {
      global.DrizzleSqliteClient = new Database(process.env.SQLITE_DB_PATH);
      console.log('[DB_INIT] New SQLite global client created for development.');
    } else {
      console.log('[DB_INIT] Reusing existing SQLite global client for development.');
    }
    sqliteClient = global.DrizzleSqliteClient;
  }

  dbInstance = drizzleSqlite(sqliteClient, {
    schema,
    logger: process.env.NODE_ENV === 'development',
  });
  console.log('✅ SQLite Drizzle instance created.');

} else {
  throw new Error(`Unsupported DB_TYPE: ${dbType}. Must be "postgres" or "sqlite".`);
}

export const db = dbInstance;
