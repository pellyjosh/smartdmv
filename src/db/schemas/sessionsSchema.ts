// sessionsSchema.ts
import { dbTable, text, timestamp, primaryKey } from '@/db/db.config';
import { relations } from 'drizzle-orm';
import { users } from './usersSchema';

export const sessions = dbTable('sessions', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { mode: 'date', withTimezone: true }).notNull(),
    data: text('data'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  });

export const sessionsRelations = relations(sessions, ({ one }) => ({
    user: one(users, {
      fields: [sessions.userId],
      references: [users.id],
    }),
  }));