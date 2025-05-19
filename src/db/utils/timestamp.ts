import { dbTable, text, timestamp, primaryKey } from '@/db/db.config';
import { relations } from 'drizzle-orm';
import { users } from './usersSchema';
import { administratorAccessiblePractices } from './usersSchema';

const dbType = process.env.DB_TYPE || 'postgres';

export const practices = dbTable('practices', {
  id: text().primaryKey(),
  name: text().notNull(),

  // Conditionally define timestamp columns for each dialect:
  createdAt:
    dbType === 'sqlite'
      ? text().notNull().default('1970-01-01T00:00:00Z') // or default to current timestamp string if you handle that at app-level
      : timestamp().notNull().defaultNow(),

  updatedAt:
    dbType === 'sqlite'
      ? text('updated_at').notNull().default('1970-01-01T00:00:00Z')
      : timestamp('updated_at').notNull().defaultNow(),
});