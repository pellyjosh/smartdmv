// sessionsSchema.ts
import { dbTable, text, timestamp } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { users } from './usersSchema';

const isSqlite = process.env.DB_TYPE === 'sqlite';

export const sessions = dbTable('sessions', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    
    // For SQLite, timestamp (which is integer) can store Unix epoch seconds or milliseconds.
    // For PG, timestamp with mode: 'date' and withTimezone: true is more appropriate.
    expiresAt: isSqlite
      ? timestamp('expires_at', {mode: 'timestamp_ms'}).notNull() // Drizzle uses integer for SQLite timestamps
      : timestamp('expires_at', { mode: 'date', withTimezone: true }).notNull(),

    data: text('data'), // Assuming JSON stored as text
    
    createdAt: isSqlite
      ? timestamp('created_at', {mode: 'timestamp_ms'}).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
      : timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  });

export const sessionsRelations = relations(sessions, ({ one }) => ({
    user: one(users, {
      fields: [sessions.userId],
      references: [users.id],
    }),
  }));
