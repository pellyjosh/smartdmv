
// schema/usersSchema.ts
import { dbTable, text, timestamp, integer, boolean } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';

const isSqlite = process.env.DB_TYPE === 'sqlite';

export const soapTemplates = dbTable('soap_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"), // e.g., "Routine Visit", "Vaccination", "Surgery"
  speciesApplicability: text("species_applicability", { mode: 'array' }), // e.g., ["canine", "feline"]
  subjective_template: text("subjective_template"), // Changed to match database column
  objective_template: text("objective_template"), // Changed to match database column
  assessment_template: text("assessment_template"), // Changed to match database column
  plan_template: text("plan_template"), // Changed to match database column
  isDefault: boolean("is_default").default(false),
  practiceId: integer("practice_id").notNull(), // For multi-practice setups
  createdById: integer("created_by_id").notNull(), // User who created the template
  createdAt: isSqlite
    ? timestamp('createdAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),

  updatedAt: isSqlite
    ? timestamp('updatedAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`).$onUpdate(() => sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdateFn(() => new Date()),
});

export type SOAPTemplate = typeof soapTemplates.$inferSelect;

export type InsertSOAPTemplate = typeof soapTemplates.$inferInsert;

export const insertSOAPTemplateSchema = createInsertSchema(soapTemplates)
  .omit({ id: true, createdAt: true, updatedAt: true });
