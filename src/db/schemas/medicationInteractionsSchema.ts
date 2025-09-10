// src/db/schemas/medicationInteractionsSchema.ts
import { dbTable, text, timestamp, integer, primaryKeyId, foreignKeyInt } from '@/db/db.config';
import { sql, relations } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { inventory } from './inventorySchema';

export const medicationInteractions = dbTable('medication_interactions', {
  id: primaryKeyId(),
  practiceId: text("practice_id").notNull(),
  medicationAId: foreignKeyInt("medication_a_id").notNull(),
  medicationBId: foreignKeyInt("medication_b_id").notNull(),
  severity: text("severity", { enum: ["mild", "moderate", "severe"] }).notNull(),
  description: text("description").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const medicationInteractionsRelations = relations(medicationInteractions, ({ one }) => ({
  medicationA: one(inventory, {
    fields: [medicationInteractions.medicationAId],
    references: [inventory.id],
  }),
  medicationB: one(inventory, {
    fields: [medicationInteractions.medicationBId],
    references: [inventory.id],
  }),
}));

export type MedicationInteraction = typeof medicationInteractions.$inferSelect;
export type NewMedicationInteraction = typeof medicationInteractions.$inferInsert;

export const insertMedicationInteractionSchema = createInsertSchema(medicationInteractions)
  .omit({ id: true, createdAt: true, updatedAt: true });

export enum InteractionSeverity {
  MILD = "mild",
  MODERATE = "moderate",
  SEVERE = "severe"
}
