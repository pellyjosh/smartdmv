
import { config } from 'dotenv';
config(); // Load environment variables at the very top

// index.ts
import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { drizzle as drizzleNeonHttp, NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

// ✅ Extend globalThis for custom caching variables
declare global {
  // biome-ignore lint/style/noVar: This is needed for global declarations
  var DrizzleNeonClient: NeonQueryFunction<false, false> | undefined; // For Neon SQL instance
  var DrizzleSqliteClient: ReturnType<typeof Database> | undefined;
}

// ✅ Ensure this file is treated as a module
export {};

let dbInstance: NeonHttpDatabase<typeof schema> | BetterSQLite3Database<typeof schema>;

const dbType = process.env.DB_TYPE || 'postgres'; // Default to PostgreSQL
console.log(`[DB_INIT] DB_TYPE set to: ${dbType}`);


if (dbType === 'postgres') {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL environment variable is not set for DB_TYPE="postgres".');
  }

  console.log('🔌 Connecting to Neon PostgreSQL database...');

  let neonSql: NeonQueryFunction<false, false>;
  if (process.env.NODE_ENV === 'production') {
    neonSql = neon(process.env.POSTGRES_URL);
  } else {
    if (!global.DrizzleNeonClient) {
      global.DrizzleNeonClient = neon(process.env.POSTGRES_URL);
      console.log('[DB_INIT] New Neon global client (sql instance) created for development.');
    } else {
      console.log('[DB_INIT] Reusing existing Neon global client (sql instance) for development.');
    }
    neonSql = global.DrizzleNeonClient;
  }

  dbInstance = drizzleNeonHttp(neonSql, {
    schema,
    logger: process.env.NODE_ENV === 'development',
  });
  console.log('✅ Neon PostgreSQL Drizzle instance created.');

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
