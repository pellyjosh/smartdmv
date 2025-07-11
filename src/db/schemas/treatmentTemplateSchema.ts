// schema/treatmentTemplateSchema.ts
import { dbTable, text, timestamp, integer, boolean } from '@/db/db.config';
import { sql } from 'drizzle-orm';
import { inventory } from './inventorySchema';
import { createInsertSchema } from 'drizzle-zod';

const isSqlite = process.env.DB_TYPE === 'sqlite';

export const treatmentTemplates = dbTable('treatment_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  practiceId: integer("practice_id").notNull(),
  name: text("name").notNull(),
  category: text("category", { enum: ["medication", "procedure", "surgery", "therapy", "diagnostic", "wellness", "other"] }).notNull(),
  description: text("description"),
  defaultDosage: text("default_dosage"),
  defaultRoute: text("default_route", { enum: ["oral", "injectable", "topical", "ophthalmic", "otic", "nasal", "rectal", "inhaled", "other"] }),
  defaultFrequency: text("default_frequency", { enum: ["once", "BID", "TID", "QID", "SID", "PRN", "EOD", "weekly", "biweekly", "monthly", "other"] }),
  defaultDuration: text("default_duration"),
  defaultInstructions: text("default_instructions"),
  defaultProcedureCode: text("default_procedure_code"),
  commonDiagnoses: text("common_diagnoses"), // List of diagnoses this treatment is commonly used for, stored as a JSON string
  inventoryItemId: integer("inventory_item_id"), // Default medication, reference to inventory.id
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdById: integer("created_by_id").notNull(),
  createdAt: isSqlite
    ? timestamp('createdAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: isSqlite
    ? timestamp('updatedAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`).$onUpdate(() => sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export type TreatmentTemplate = typeof treatmentTemplates.$inferSelect;

export const insertTreatmentTemplateSchema = createInsertSchema(treatmentTemplates)
  .omit({ id: true, createdAt: true, updatedAt: true });
