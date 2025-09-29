// drizzle.owner.config.ts
import type { Config } from 'drizzle-kit';

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

const connectionString = normalizeConnectionString(process.env.OWNER_DATABASE_URL!);

export default {
  schema: './src/db/owner-schema.ts',
  out: './src/db/migrations/owner',
  dialect: 'postgresql',
 dbCredentials: {
    url: connectionString,
    ssl: { rejectUnauthorized: false }
  },
  verbose: true,
  strict: true,
} satisfies Config;
