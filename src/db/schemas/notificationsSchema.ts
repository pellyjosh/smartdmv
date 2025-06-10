// src/db/schemas/notificationsSchema.ts
import { dbTable, text, timestamp, } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { users } from './usersSchema';
import { practices } from './practicesSchema';

const isSqlite = process.env.DB_TYPE === 'sqlite';

export const notificationTypeEnum = ['info', 'alert', 'reminder', 'system'] as const;

export const notifications = dbTable('notifications', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), // The user this notification is for
  practiceId: text('practice_id').references(() => practices.id, { onDelete: 'cascade' }), // Contextual practice
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type', { enum: notificationTypeEnum }).default('info'),
  read: boolean('read').default(false).notNull(),
  link: text('link'), // Optional link to navigate to

  // createdAt is used by the widget, so we ensure it's here and matches widget expectations
  createdAt: isSqlite
    ? timestamp('createdAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),

  updatedAt: isSqlite
    ? timestamp('updatedAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`).$onUpdate(() => sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdateFn(() => new Date()),
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