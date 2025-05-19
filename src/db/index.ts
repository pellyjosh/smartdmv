
import { drizzle } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import postgres from 'postgres';
import Database from 'better-sqlite3';
import * as schema from './schema'; // This schema is PG-focused

// Ensure environment variables are loaded (e.g., by next.config.js or a .env file)
// require('dotenv').config(); // Uncomment if not handled elsewhere

let dbInstance: any; // Using any for simplicity, could be a union type of Drizzle clients

const dbType = process.env.DB_TYPE || 'postgres'; // Default to postgres

if (dbType === 'postgres') {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL environment variable is not set for DB_TYPE="postgres".');
  }
  console.log("Connecting to PostgreSQL database...");
  // For persistent connection in development, and a new connection in production per serverless function instance.
  declare global {
    // biome-ignore lint/style/noVar: This is to allow global declaration for connection caching.
    var DrizzlePostgresClient: postgres.Sql | undefined;
  }

  let sqlClient: postgres.Sql;
  if (process.env.NODE_ENV === 'production') {
    sqlClient = postgres(process.env.POSTGRES_URL, { prepare: false });
  } else {
    if (!global.DrizzlePostgresClient) {
      global.DrizzlePostgresClient = postgres(process.env.POSTGRES_URL, { prepare: false });
    }
    sqlClient = global.DrizzlePostgresClient;
  }
  // The schema is PG-focused. This will work fine.
  dbInstance = drizzle(sqlClient, { schema, logger: process.env.NODE_ENV === 'development' });

} else if (dbType === 'sqlite') {
  if (!process.env.SQLITE_DB_PATH) {
    throw new Error('SQLITE_DB_PATH environment variable is not set for DB_TYPE="sqlite".');
  }
  console.log(`Connecting to SQLite database at: ${process.env.SQLITE_DB_PATH}`);

  declare global {
    // biome-ignore lint/style/noVar: This is to allow global declaration for connection caching.
    var DrizzleSqliteClient: ReturnType<typeof Database> | undefined;
  }
  
  let sqliteClient: ReturnType<typeof Database>;

  if (process.env.NODE_ENV === 'production') {
    sqliteClient = new Database(process.env.SQLITE_DB_PATH);
  } else {
    if (!global.DrizzleSqliteClient) {
      global.DrizzleSqliteClient = new Database(process.env.SQLITE_DB_PATH);
    }
    sqliteClient = global.DrizzleSqliteClient;
  }
  
  // IMPORTANT: The imported 'schema' is PG-focused (uses pgTable).
  // Drizzle's SQLite driver might handle basic cases, but for complex PG-specific
  // features or types in your schema, this could lead to runtime errors or
  // unexpected behavior with SQLite.
  // For robust multi-dialect support, you'd typically have separate schema files
  // (e.g., schema.postgres.ts, schema.sqlite.ts) and a dynamic drizzle.config.ts.
  dbInstance = drizzleSqlite(sqliteClient, { schema, logger: process.env.NODE_ENV === 'development' });

} else {
  throw new Error(`Unsupported DB_TYPE: ${dbType}. Must be "postgres" or "sqlite".`);
}

export const db = dbInstance;
