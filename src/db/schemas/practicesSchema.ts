import { dbTable, text, timestamp, primaryKeyId } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { users } from './usersSchema';
import { administratorAccessiblePractices } from './usersSchema';

export const practices = dbTable('practices', {
  id: primaryKeyId(),
  name: text('name').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull().$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const practicesRelations = relations(practices, ({ many }) => ({
  usersPractice: many(users, { relationName: 'usersPracticeRelation' }),
  usersCurrentPractice: many(users, { relationName: 'usersCurrentPracticeRelation' }),
  accessibleToAdmins: many(administratorAccessiblePractices),
}));

export interface Practice {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
