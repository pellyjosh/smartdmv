// sessionsSchema.ts
import { dbTable, text, timestamp } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { users } from './usersSchema';

const isSqlite = process.env.DB_TYPE === 'sqlite';

export const sessions = dbTable('sessions', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID() as any),
    userId: text('user_id').notNull().references(() => users.id as any, { onDelete: 'cascade' }),
    
    // For SQLite, timestamp (which is integer) can store Unix epoch seconds or milliseconds.
    // For PG, timestamp with mode: 'date' and withTimezone: true is more appropriate.
    expiresAt: isSqlite
      ? timestamp('expiresAt', {mode: 'timestamp_ms'}).notNull() // Drizzle uses integer for SQLite timestamps
      : timestamp('expiresAt').notNull(),

    data: text('data'), // Assuming JSON stored as text
    
    createdAt: isSqlite
      ? timestamp('createdAt', {mode: 'timestamp_ms'}).notNull().default(sql`CURRENT_TIMESTAMP`)
      : timestamp('createdAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`)
  });

export const sessionsRelations = relations(sessions, ({ one }) => ({
    user: one(users, {
      fields: [sessions.userId],
      references: [users.id],
    }),
  }));

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  data: string | null;
  createdAt: Date;
}
