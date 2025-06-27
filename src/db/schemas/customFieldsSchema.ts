// src/db/schemas/customFieldsSchema.ts
import { dbTable, text, integer, timestamp } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { practices } from './practicesSchema'; // Ensure practices is imported

const isSqlite = process.env.DB_TYPE === 'sqlite';

export const customFieldCategories = dbTable('custom_field_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  practiceId: text('practice_id').references(() => practices.id, { onDelete: 'cascade' }).notNull(), // Added .notNull() as practiceId seems mandatory from previous context
  name: text('name').notNull(),
  description: text('description'),

  createdAt: isSqlite
    ? timestamp('createdAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),

  updatedAt: isSqlite
    ? timestamp('updatedAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`).$onUpdate(() => sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdateFn(() => new Date()),
});

export const customFieldGroups = dbTable('custom_field_groups', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  categoryId: integer('category_id').references(() => customFieldCategories.id, { onDelete: 'cascade' }).notNull(),
  practiceId: text('practice_id').references(() => practices.id, { onDelete: 'cascade' }).notNull(), // Added .notNull()
  name: text('name').notNull(),
  key: text('key').notNull(),
  description: text('description'),
  createdAt: isSqlite
    ? timestamp('createdAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),

  updatedAt: isSqlite
    ? timestamp('updatedAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`).$onUpdate(() => sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdateFn(() => new Date()),
});

export const customFieldValues = dbTable('custom_field_values', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  groupId: integer('group_id').references(() => customFieldGroups.id, { onDelete: 'cascade' }).notNull(),
  practiceId: text('practice_id').references(() => practices.id, { onDelete: 'cascade' }).notNull(), // Added .notNull()
  value: text('value'),
  label: text('label'),
  isActive: integer('is_active', { mode: "boolean" }).default(true).notNull(), // Use integer with boolean mode
  createdAt: isSqlite
    ? timestamp('createdAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),

  updatedAt: isSqlite
    ? timestamp('updatedAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`).$onUpdate(() => sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdateFn(() => new Date()),
});

// --- Existing Relations (no change here) ---
export const customFieldGroupRelations = relations(customFieldGroups, ({ one, many }) => ({
  category: one(customFieldCategories, {
    fields: [customFieldGroups.categoryId],
    references: [customFieldCategories.id],
  }),
  // NEW: Relation to practices from customFieldGroups
  practice: one(practices, { // A group belongs to one practice
    fields: [customFieldGroups.practiceId],
    references: [practices.id],
  }),
}));

export const customFieldValueRelations = relations(customFieldValues, ({ one }) => ({
  group: one(customFieldGroups, {
    fields: [customFieldValues.groupId],
    references: [customFieldGroups.id],
  }),
  // NEW: Relation to practices from customFieldValues
  practice: one(practices, { // A value belongs to one practice
    fields: [customFieldValues.practiceId],
    references: [practices.id],
  }),
}));

export const customFieldCategoryRelations = relations(customFieldCategories, ({ many, one }) => ({ // Added 'one' for the new relation
  groups: many(customFieldGroups),
  // NEW: Relation to practices from customFieldCategories
  practice: one(practices, { // A category belongs to one practice
    fields: [customFieldCategories.practiceId],
    references: [practices.id],
  }),
}));

// --- Relations for the 'practices' table to link back to custom field tables ---
// This assumes 'practices' schema can import 'customFieldsSchema',
// or these relations are defined in the practicesSchema.ts
// If you cannot import customFieldsSchema into practicesSchema (circular dependency),
// then you might define these in a separate relations file, or just query separately.
// However, the standard Drizzle approach is to define relations where the 'many' side is.
// So, we'll add them to practicesSchema.ts if it imports customFieldsSchema
// Or, for simplicity and to avoid circular deps, you can just define the 'one' side here.

// If you want to query practices and get their custom field categories/groups/values:
// You would add these relations inside practicesSchema.ts
/*
// In src/db/schemas/practicesSchema.ts
import { relations } from 'drizzle-orm';
import { practices } from './practicesSchema'; // Self-reference
import { customFieldCategories, customFieldGroups, customFieldValues } from './customFieldsSchema';

export const practicesRelations = relations(practices, ({ many }) => ({
  // ... existing relations (e.g., users, pets)
  customFieldCategories: many(customFieldCategories),
  customFieldGroups: many(customFieldGroups), // Only if customFieldGroups is not solely tied to categories
  customFieldValues: many(customFieldValues), // Only if customFieldValues is not solely tied to groups
}));
*/


export type SelectCustomFieldCategory = typeof customFieldCategories.$inferSelect;
export type InsertCustomFieldCategory = typeof customFieldCategories.$inferInsert;

export type SelectCustomFieldGroup = typeof customFieldGroups.$inferSelect;
export type InsertCustomFieldGroup = typeof customFieldGroups.$inferInsert;

export type SelectCustomFieldValue = typeof customFieldValues.$inferSelect;
export type InsertCustomFieldValue = typeof customFieldValues.$inferInsert;

export interface CustomFieldValue {
  value: string;
  label: string;
}