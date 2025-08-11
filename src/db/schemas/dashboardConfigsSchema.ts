import { dbTable, text, timestamp, boolean, primaryKeyId } from '@/db/db.config';
import { users } from './usersSchema';
import { practices } from './practicesSchema';
import { relations, sql } from 'drizzle-orm';

// Dashboard configurations table
export const dashboardConfigs = dbTable('dashboard_configs', {
  id: primaryKeyId(),
  name: text('name').notNull(),
  userId: text('user_id').notNull(),
  practiceId: text('practice_id'),
  config: text('config').notNull(), // JSON string containing dashboard configuration
  role: text('role'), // Optional role for role-based templates
  isDefault: boolean('is_default').notNull().default(false),
  created_at: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),

  updated_at: timestamp('updated_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

// Dashboard config relations
export const dashboardConfigsRelations = relations(dashboardConfigs, ({ one }) => ({
  user: one(users, {
    fields: [dashboardConfigs.userId],
    references: [users.id],
  }),
  practice: one(practices, {
    fields: [dashboardConfigs.practiceId],
    references: [practices.id],
  }),
}));

export type DashboardConfig = typeof dashboardConfigs.$inferSelect;
export type NewDashboardConfig = typeof dashboardConfigs.$inferInsert;
