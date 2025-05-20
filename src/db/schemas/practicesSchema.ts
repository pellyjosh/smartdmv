import { dbTable, text, timestamp } from '@/db/db.config'; // Removed primaryKey as it's not used here
import { relations, sql } from 'drizzle-orm';
import { users } from './usersSchema';
import { administratorAccessiblePractices } from './usersSchema'; // Keep this if it's the join table

const isSqlite = process.env.DB_TYPE === 'sqlite';

export const practices = dbTable('practices', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  createdAt: isSqlite
    ? timestamp('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),

  updatedAt: isSqlite
    ? timestamp('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`).$onUpdate(() => new Date())
    : timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const practicesRelations = relations(practices, ({ many }) => ({
  usersPractice: many(users, { relationName: 'usersPracticeRelation' }),
  usersCurrentPractice: many(users, { relationName: 'usersCurrentPracticeRelation' }),
  accessibleToAdmins: many(administratorAccessiblePractices),
}));
