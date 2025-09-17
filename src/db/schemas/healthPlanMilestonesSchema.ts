import { dbTable, primaryKeyId, foreignKeyInt, text, timestamp, boolean } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { healthPlans } from './healthPlansSchema';

export const healthPlanMilestones = dbTable('health_plan_milestones', {
  id: primaryKeyId(),
  healthPlanId: foreignKeyInt('health_plan_id').notNull().references(() => healthPlans.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  dueDate: timestamp('dueDate'),
  completed: boolean('completed').notNull().default(sql`false`),
  completedOn: timestamp('completedOn'),
  createdAt: timestamp('createdAt').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const healthPlanMilestonesRelations = relations(healthPlanMilestones, ({ one }) => ({
  healthPlan: one(healthPlans, {
    fields: [healthPlanMilestones.healthPlanId],
    references: [healthPlans.id],
  }),
}));

export type SelectHealthPlanMilestone = typeof healthPlanMilestones.$inferSelect;
export type InsertHealthPlanMilestone = typeof healthPlanMilestones.$inferInsert;

export interface HealthPlanMilestone {
  id: string;
  healthPlanId: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  completed: boolean;
  completedOn: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
