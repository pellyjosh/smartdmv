import { dbTable, text, timestamp, foreignKeyText, integer, boolean, primaryKeyId } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';

export const permissionOverrides = dbTable('permission_overrides', {
  // Keep column names snake_case, expose camelCase properties in TS
  id: primaryKeyId(),
  userId: foreignKeyText('user_id').notNull(),
  userName: text('user_name').notNull(),
  userEmail: text('user_email').notNull(),
  resource: text('resource').notNull(),
  action: text('action').notNull(),
  granted: boolean('granted').notNull(),
  reason: text('reason').notNull(),
  expiresAt: timestamp('expires_at'),
  practiceId: integer('practice_id').notNull(),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  createdBy: text('created_by').notNull(),
  status: text('status').notNull(),
});

export const permissionOverridesRelations = relations(permissionOverrides, ({ one }) => ({
  // add relations if needed in future (e.g., user, practice)
}));

export type SelectPermissionOverride = typeof permissionOverrides.$inferSelect;
export type InsertPermissionOverride = typeof permissionOverrides.$inferInsert;

export interface PermissionOverride {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  resource: string;
  action: string;
  granted: boolean;
  reason: string;
  expiresAt: Date | null;
  practiceId: number;
  createdAt: Date;
  createdBy: string;
  status: string;
}
