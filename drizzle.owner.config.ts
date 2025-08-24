// drizzle.owner.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/owner/db/schema.ts',
  out: './src/owner/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL?.includes('%23') ? process.env.DATABASE_URL : (process.env.DATABASE_URL || '').replace('#', '%23'),
  },
  verbose: true,
  strict: true,
} satisfies Config;
