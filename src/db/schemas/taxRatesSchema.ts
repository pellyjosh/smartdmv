// src/db/schemas/taxRatesSchema.ts
import { dbTable, text, timestamp, integer, decimal, primaryKeyId, foreignKeyInt } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { practices } from './practicesSchema';
import { createInsertSchema } from 'drizzle-zod';

// Tax Rates table
export const taxRates = dbTable('tax_rates', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id),
  name: text('name').notNull(),
  rate: decimal('rate').notNull(), // e.g., 8.25 for 8.25%
  type: text('type', { enum: ['percentage', 'fixed'] }).notNull().default(sql`'percentage'`),
  isDefault: text('is_default', { enum: ['yes', 'no'] }).notNull().default(sql`'no'`),
  active: text('active', { enum: ['yes', 'no'] }).notNull().default(sql`'yes'`),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const taxRatesRelations = relations(taxRates, ({ one }) => ({
  practice: one(practices, {
    fields: [taxRates.practiceId],
    references: [practices.id],
  }),
}));

// Zod schemas
export const insertTaxRateSchema = createInsertSchema(taxRates);
export const selectTaxRateSchema = createInsertSchema(taxRates);
