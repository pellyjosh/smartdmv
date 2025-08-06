// schema/soapTemplatesSchema.ts
import { dbTable, text, timestamp, integer, boolean } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';

const isSqlite = process.env.DB_TYPE === 'sqlite';

export const soapTemplates = dbTable('soap_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
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
  practiceId: text("practice_id").notNull(),
  createdById: integer("created_by_id").notNull(),
  
  createdAt: isSqlite
    ? timestamp('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),

  updatedAt: isSqlite
    ? timestamp('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`).$onUpdate(() => sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updated_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export type SOAPTemplate = typeof soapTemplates.$inferSelect;
export type InsertSOAPTemplate = typeof soapTemplates.$inferInsert;

export const insertSOAPTemplateSchema = createInsertSchema(soapTemplates)
  .omit({ id: true, createdAt: true, updatedAt: true });
