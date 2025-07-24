// src/db/schemas/notificationsSchema.ts
import { dbTable, text, timestamp, boolean, integer } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { users } from './usersSchema';
import { practices } from './practicesSchema';

const isSqlite = process.env.DB_TYPE === 'sqlite';

export const notificationTypeEnum = ['appointment', 'healthPlan', 'message', 'system', 'info', 'alert', 'reminder'] as const;

export const notifications = dbTable('notifications', {
  // Use text UUID for both PostgreSQL and SQLite
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID() as any),
  
  // User ID - use text for both PostgreSQL and SQLite  
  userId: text('user_id').notNull().references(() => users.id as any, { onDelete: 'cascade' }),
    
  // Practice ID for context - use text for both databases
  practiceId: text('practice_id').references(() => practices.id as any, { onDelete: 'cascade' }),
    
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull().default('info'),
  read: boolean('read').default(false).notNull(),
  
  // Related entity information - use text for both databases
  relatedId: text('related_id'),
  relatedType: text('related_type'), // "appointment", "health_plan", etc.
  
  // Optional link to navigate to
  link: text('link'),

  // Timestamps - strict snake_case
  createdAt: isSqlite
    ? timestamp('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),

  updatedAt: isSqlite
    ? timestamp('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`).$onUpdate(() => sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  practice: one(practices, {
    fields: [notifications.practiceId],
    references: [practices.id],
  }),
}));

export type SelectNotification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

export interface Notification {
  id: string;
  userId: string;
  practiceId: string | null;
  title: string;
  message: string;
  type: (typeof notificationTypeEnum)[number] | null;
  read: boolean;
  link: string | null;
  createdAt: Date;
  updatedAt: Date;
}