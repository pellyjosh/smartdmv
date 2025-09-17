// src/db/schemas/healthPlanNotesSchema.ts
import { dbTable, text, timestamp, primaryKeyId, foreignKeyInt } from '@/db/db.config';
import { relations } from 'drizzle-orm';
import { healthPlans } from './healthPlansSchema';
import { users } from './usersSchema';

export const healthPlanNotes = dbTable('health_plan_notes', {
  id: primaryKeyId(),
  healthPlanId: foreignKeyInt('health_plan_id').notNull().references(() => healthPlans.id, { onDelete: 'cascade' }),
  note: text('note').notNull(),
  createdById: foreignKeyInt('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export const healthPlanNotesRelations = relations(healthPlanNotes, ({ one }) => ({
  healthPlan: one(healthPlans, {
    fields: [healthPlanNotes.healthPlanId],
    references: [healthPlans.id],
  }),
  createdBy: one(users, {
    fields: [healthPlanNotes.createdById],
    references: [users.id],
  }),
}));

export type SelectHealthPlanNote = typeof healthPlanNotes.$inferSelect;
export type InsertHealthPlanNote = typeof healthPlanNotes.$inferInsert;

export interface HealthPlanNote {
  id: string;
  healthPlanId: string;
  note: string;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}
