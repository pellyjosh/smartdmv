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
  schema: './src/owner/db/schema.ts',
  out: './src/owner/db/migrations',
  dialect: 'postgresql',
 dbCredentials: {
    url: connectionString,
  },
  verbose: true,
  strict: true,
} satisfies Config;
