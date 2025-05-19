import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' }); // Ensure .env is loaded

const dbType = process.env.DB_TYPE || 'postgres';

let config: Config;

if (dbType === 'postgres') {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not set in .env for PostgreSQL migrations');
  }
  config = {
    schema: './src/db/schema.ts',
    out: './src/db/migrations', 
    dialect: 'postgresql',
    dbCredentials: {
      url: process.env.POSTGRES_URL,
    },
    verbose: true,
    strict: true,
  };
} else if (dbType === 'sqlite') {
  if (!process.env.SQLITE_DB_PATH) {
    throw new Error('SQLITE_DB_PATH is not set in .env for SQLite migrations');
  }
  config = {
    schema: './src/db/schema.ts', // Note: Using the same schema file for now. For full SQLite compatibility, you might need a separate schema definition or careful use of types.
    out: './src/db/migrations_sqlite', 
    dialect: 'sqlite',
    dbCredentials: {
      url: process.env.SQLITE_DB_PATH,
    },
    verbose: true,
    strict: true,
  };
} else {
  throw new Error(`Unsupported DB_TYPE in drizzle.config.ts: ${dbType}. Must be "postgres" or "sqlite".`);
}

export default config;
