// src/db/schemas/healthPlansSchema.ts
import { dbTable, text, timestamp } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { pets } from './petsSchema';
import { practices } from './practicesSchema';

const isSqlite = process.env.DB_TYPE === 'sqlite';

export const healthPlanStatusEnum = ['active', 'inactive', 'completed', 'pending'] as const;

export const healthPlans = dbTable('health_plans', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  petId: text('pet_id').notNull().references(() => pets.id, { onDelete: 'cascade' }),
  practiceId: text('practice_id').notNull().references(() => practices.id, { onDelete: 'cascade' }),
  planType: text('plan_type'), // e.g., 'Wellness', 'Dental', 'Senior Care'
  description: text('description'),
  status: text('status', { enum: healthPlanStatusEnum }).notNull().default('pending'),
  startDate: timestamp('startDate', { mode: 'date' }),
  endDate: timestamp('endDate', { mode: 'date' }),

  createdAt: isSqlite
    ? timestamp('createdAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),

  updatedAt: isSqlite
    ? timestamp('updatedAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`).$onUpdate(() => sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdateFn(() => new Date()),
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