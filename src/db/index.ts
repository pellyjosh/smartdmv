
import { config } from 'dotenv';
config(); // Load environment variables at the very top

// index.ts
import { neon, neonConfig, NeonQueryFunction } from '@neondatabase/serverless';
import { drizzle as drizzleNeonHttp, NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// ✅ Extend globalThis for custom caching variables
declare global {
  // biome-ignore lint/style/noVar: This is needed for global declarations
  var DrizzleNeonClient: NeonQueryFunction<false, false> | undefined; // For Neon SQL instance
}

// ✅ Ensure this file is treated as a module
export {};

let dbInstance: NeonHttpDatabase<typeof schema>;

console.log('[DB_INIT] Using PostgreSQL database');

// For production apps, prefer pooler for better performance
// For development/migrations, use direct connection for reliability
const isDrizzleKit = process.env.npm_lifecycle_event?.includes('db:') || 
                     process.argv.some(arg => arg.includes('drizzle-kit'));

// Improve connection stability in serverless/HTTP mode
// Caches the HTTP connection across invocations to reduce connect timeouts
neonConfig.fetchConnectionCache = true;

// Prefer POOLER for app runtime when available; use direct URL for migrations
const postgresUrl = isDrizzleKit 
  ? process.env.POSTGRES_URL 
  : (process.env.POSTGRES_URL_POOLER || process.env.POSTGRES_URL);

if (!postgresUrl) {
  throw new Error('POSTGRES_URL environment variable is not set.');
}

console.log(`🔌 Connecting to Neon PostgreSQL database... (${isDrizzleKit ? 'direct' : (process.env.POSTGRES_URL_POOLER ? 'pooler' : 'direct')})`);

let neonSql: NeonQueryFunction<false, false>;
if (process.env.NODE_ENV === 'production') {
  neonSql = neon(postgresUrl);
} else {
  if (!global.DrizzleNeonClient) {
    global.DrizzleNeonClient = neon(postgresUrl);
    console.log('[DB_INIT] New Neon global client (sql instance) created for development.');
  } else {
    console.log('[DB_INIT] Reusing existing Neon global client (sql instance) for development.');
  }
  neonSql = global.DrizzleNeonClient;
}

// Note: Drizzle's built-in logger may attempt to call toISOString on values that
// are not actual Date instances in some nested results (e.g., Neon HTTP adapter),
// which can crash at runtime. Disable the logger to avoid this.
dbInstance = drizzleNeonHttp(neonSql, {
  schema,
  logger: false,
});
console.log('✅ Neon PostgreSQL Drizzle instance created.');

export const db = dbInstance;
