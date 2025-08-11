// src/db/schemas/notificationsSchema.ts
import { dbTable, text, timestamp, boolean, integer, primaryKeyId, foreignKeyInt } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { users } from './usersSchema';
import { practices } from './practicesSchema';

export const notificationTypeEnum = ['appointment', 'healthPlan', 'message', 'system', 'info', 'alert', 'reminder'] as const;

export const notifications = dbTable('notifications', {
  id: primaryKeyId(),
  
  // User ID - use integer foreign key 
  userId: foreignKeyInt('user_id').notNull().references(() => users.id as any, { onDelete: 'cascade' }),
    
  // Practice ID for context - use integer foreign key
  practiceId: foreignKeyInt('practice_id').references(() => practices.id as any, { onDelete: 'cascade' }),
    
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull().default(sql`'info'`),
  read: boolean('read').default(false).notNull(),
  
  // Related entity information
  relatedId: text('related_id'),
  relatedType: text('related_type'), // "appointment", "health_plan", etc.
  
  // Optional link to navigate to
  link: text('link'),

  // Timestamps
  created_at: timestamp('created_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp('updated_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
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