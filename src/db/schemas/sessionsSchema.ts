
// sessionsSchema.ts
import { dbTable, text, timestamp } from '@/db/db.config';
import { relations } from 'drizzle-orm';
import { users } from './usersSchema';

const isSqlite = process.env.DB_TYPE === 'sqlite';

export const sessions = dbTable('sessions', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    
    expiresAt: isSqlite
      ? timestamp('expires_at').notNull() // This is sqliteCore.integer() from db.config.ts
      : timestamp('expires_at', { mode: 'date', withTimezone: true }).notNull(), // This is pgCore.timestamp()

    data: text('data'), // Assuming JSON stored as text
    
    createdAt: isSqlite
      ? timestamp('created_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000))
      : timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  });

export const sessionsRelations = relations(sessions, ({ one }) => ({
    user: one(users, {
      fields: [sessions.userId],
      references: [users.id],
    }),
  }));
