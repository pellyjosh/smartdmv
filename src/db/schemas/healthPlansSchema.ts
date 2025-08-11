// src/db/schemas/healthPlansSchema.ts
import { dbTable, text, timestamp, primaryKeyId, foreignKeyInt } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { pets } from './petsSchema';
import { practices } from './practicesSchema';

export const healthPlanStatusEnum = ['active', 'inactive', 'completed', 'pending'] as const;

export const healthPlans = dbTable('health_plans', {
  id: primaryKeyId(),
  name: text('name').notNull(),
  petId: foreignKeyInt('pet_id').notNull().references(() => pets.id, { onDelete: 'cascade' }),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id, { onDelete: 'cascade' }),
  planType: text('plan_type'), // e.g., 'Wellness', 'Dental', 'Senior Care'
  description: text('description'),
  status: text('status', { enum: healthPlanStatusEnum }).notNull().default(sql`'pending'`),
  startDate: timestamp('startDate', { mode: 'date' }),
  endDate: timestamp('endDate', { mode: 'date' }),

  createdAt: timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const healthPlansRelations = relations(healthPlans, ({ one }) => ({
  pet: one(pets, {
    fields: [healthPlans.petId],
    references: [pets.id],
  }),
  practice: one(practices, {
    fields: [healthPlans.practiceId],
    references: [practices.id],
  }),
}));

export type SelectHealthPlan = typeof healthPlans.$inferSelect;
export type InsertHealthPlan = typeof healthPlans.$inferInsert;

export interface HealthPlan {
  id: string;
  name: string;
  petId: string;
  practiceId: string;
  planType: string | null;
  description: string | null;
  status: (typeof healthPlanStatusEnum)[number];
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}