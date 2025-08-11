// sessionsSchema.ts
import { dbTable, text, timestamp, primaryKeyId, foreignKeyInt } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { users } from './usersSchema';

export const sessions = dbTable('sessions', {
    id: primaryKeyId(),
    userId: foreignKeyInt('user_id').notNull().references(() => users.id as any, { onDelete: 'cascade' }),
    
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
    data: text('data'), // JSON stored as text
    
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
  });

export const sessionsRelations = relations(sessions, ({ one }) => ({
    user: one(users, {
      fields: [sessions.userId],
      references: [users.id],
    }),
  }));

export interface Session {
  id: number;
  userId: number;
  expiresAt: Date;
  data: string | null;
  createdAt: Date;
  updatedAt: Date;
}
