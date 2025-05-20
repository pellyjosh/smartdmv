import { dbTable, text, timestamp } from '@/db/db.config'; // Removed primaryKey as it's not used here
import { relations, sql } from 'drizzle-orm';
import { users } from './usersSchema';
import { administratorAccessiblePractices } from './usersSchema'; // Keep this if it's the join table

const isSqlite = process.env.DB_TYPE === 'sqlite';

export const practices = dbTable('practices', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  createdAt: isSqlite
    ? timestamp('createdAt', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`)
    : timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),

  updatedAt: isSqlite
    ? timestamp('updatedAt', { mode: 'timestamp_ms' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`)
    : timestamp('updatedAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const practicesRelations = relations(practices, ({ many }) => ({
  usersPractice: many(users, { relationName: 'usersPracticeRelation' }),
  usersCurrentPractice: many(users, { relationName: 'usersCurrentPracticeRelation' }),
  accessibleToAdmins: many(administratorAccessiblePractices),
}));
