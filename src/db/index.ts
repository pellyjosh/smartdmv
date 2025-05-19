
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set. Please add it to your .env file.');
}

// For persistent connection in development, and a new connection in production per serverless function instance.
// Adjust this strategy based on your deployment environment if needed.
declare global {
  // biome-ignore lint/style/noVar: This is to allow global declaration for connection caching.
  var DrizzleSqlClient: postgres.Sql | undefined;
}

let sqlClient: postgres.Sql;

if (process.env.NODE_ENV === 'production') {
  sqlClient = postgres(process.env.POSTGRES_URL, { prepare: false });
} else {
  if (!global.DrizzleSqlClient) {
    global.DrizzleSqlClient = postgres(process.env.POSTGRES_URL, { prepare: false });
  }
  sqlClient = global.DrizzleSqlClient;
}

export const db = drizzle(sqlClient, { schema });
