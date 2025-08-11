// schema/soapTemplatesSchema.ts
import { dbTable, text, timestamp, integer, boolean, primaryKeyId, foreignKeyInt } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';

export const soapTemplates = dbTable('soap_templates', {
  id: primaryKeyId(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"), // "Routine Visit", "Vaccination", "Surgery"
  speciesApplicability: text("species_applicability"), // JSON array ["canine", "feline"]
  
  // Template Content
  subjectiveTemplate: text("subjective_template"),
  objectiveTemplate: text("objective_template"),
  assessmentTemplate: text("assessment_template"),
  planTemplate: text("plan_template"),
  
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
