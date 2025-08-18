import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' }); // Ensure .env is loaded

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL is not set in .env');
}

const config: Config = {
  schema: './src/db/schema.ts',
  out: './src/db/migrations', 
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.POSTGRES_URL,
  },
  verbose: true,
  strict: true,
};

export default config;
