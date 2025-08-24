import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' }); // Ensure .env is loaded

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in .env');
}

// Normalize connection string for RDS (handle special characters in password)
function normalizeConnectionString(conn: string): string {
  try { new URL(conn); return conn; } catch (e) {}
  const m = conn.match(/^([^:]+:\/\/)([^@]+)@(.*)$/);
  if (m) {
    const [, scheme, userinfo, rest] = m;
    const parts = userinfo.split(':');
    if (parts.length >= 2) {
      const user = parts.shift()!;
      const pass = parts.join(':');
      const encPass = encodeURIComponent(pass);
      return `${scheme}${user}:${encPass}@${rest}`;
    }
  }
  return conn;
}

const connectionString = normalizeConnectionString(process.env.DATABASE_URL!);

const config: Config = {
  schema: './src/db/schema.ts',
  out: './src/db/migrations', 
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionString,
    ssl: { rejectUnauthorized: false }
  },
  verbose: true,
  strict: true,
};

export default config;
