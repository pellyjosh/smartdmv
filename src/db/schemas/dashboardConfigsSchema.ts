import { dbTable, text, timestamp, integer, boolean } from '@/db/db.config';
import { users } from './usersSchema';
import { practices } from './practicesSchema';
import { relations, sql } from 'drizzle-orm';

const isSqlite = process.env.DB_TYPE === 'sqlite';

// Dashboard configurations table
export const dashboardConfigs = dbTable('dashboard_configs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  userId: text('user_id').notNull(),
  practiceId: text('practice_id'),
  config: text('config').notNull(), // JSON string containing dashboard configuration
  role: text('role'), // Optional role for role-based templates
  isDefault: boolean('is_default').notNull().default(false),
  created_at: isSqlite
    ? timestamp('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),

  updated_at: isSqlite
    ? timestamp('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`).$onUpdate(() => sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updated_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
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
