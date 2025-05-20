import { dbTable, text, timestamp, primaryKey } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { users } from './usersSchema';
import { administratorAccessiblePractices } from './usersSchema';

const isSqlite = process.env.DB_TYPE === 'sqlite';

export const practices = dbTable('practices', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: isSqlite
    ? timestamp('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`) // SQLite integer timestamp default
    : timestamp('created_at').defaultNow().notNull(), // Postgres timestamp defaultNow()

  updatedAt: isSqlite
    ? timestamp('updated_at').notNull().default(sql`(strftime('%s', 'now') * 1000)`).$onUpdate(() => new Date()) // SQLite integer timestamp default
    : timestamp('created_at').defaultNow().notNull(), // Postgres timestamp defaultNow()
});

export const practicesRelations = relations(practices, ({ many }) => ({
  usersPractice: many(users, { relationName: 'usersPracticeRelation' }),
  usersCurrentPractice: many(users, { relationName: 'usersCurrentPracticeRelation' }),
  accessibleToAdmins: many(administratorAccessiblePractices),
}));