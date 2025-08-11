
// schema/soapNoteTemplateSchema.ts
import { dbTable, text, timestamp, integer, boolean, primaryKeyId, foreignKeyInt } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';

export const soapTemplates = dbTable('soap_templates', {
  id: primaryKeyId(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"), // e.g., "Routine Visit", "Vaccination", "Surgery"
  speciesApplicability: text("species_applicability"), // JSON array as text for PostgreSQL
  subjective_template: text("subjective_template"),
  objective_template: text("objective_template"),
  assessment_template: text("assessment_template"),
  plan_template: text("plan_template"),
  isDefault: boolean("is_default").default(false),
  practiceId: foreignKeyInt("practice_id").notNull(),
  createdById: foreignKeyInt("created_by_id").notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export type SOAPTemplate = typeof soapTemplates.$inferSelect;

export type InsertSOAPTemplate = typeof soapTemplates.$inferInsert;

export const insertSOAPTemplateSchema = createInsertSchema(soapTemplates)
  .omit({ id: true, createdAt: true, updatedAt: true });
