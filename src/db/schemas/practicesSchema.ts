
import { dbTable, text, timestamp, primaryKey } from '@/db/db.config';
import { relations } from 'drizzle-orm';
import { users } from './usersSchema';
import { administratorAccessiblePractices } from './usersSchema';

const isSqlite = process.env.DB_TYPE === 'sqlite';

export const practices = dbTable('practices', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),

  createdAt: isSqlite
    ? timestamp('created_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000))
    : timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),

  updatedAt: isSqlite
    ? timestamp('updated_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000))
    : timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
});

export const practicesRelations = relations(practices, ({ many }) => ({
  usersPractice: many(users, { relationName: 'usersPracticeRelation' }),
  usersCurrentPractice: many(users, { relationName: 'usersCurrentPracticeRelation' }),
  accessibleToAdmins: many(administratorAccessiblePractices),
}));
