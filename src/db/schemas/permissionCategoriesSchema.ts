import { pgTable, serial, varchar, text, boolean, timestamp, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { practices } from './practicesSchema';

export const permissionCategories = pgTable('permission_categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  displayOrder: integer('display_order').default(0),
  icon: varchar('icon', { length: 100 }),
  isActive: boolean('is_active').default(true),
  isSystemDefined: boolean('is_system_defined').default(false),
  practiceId: integer('practice_id').references(() => practices.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const permissionResources = pgTable('permission_resources', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').references(() => permissionCategories.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const permissionActions = pgTable('permission_actions', {
  id: serial('id').primaryKey(),
  resourceId: integer('resource_id').references(() => permissionResources.id).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const permissionCategoriesRelations = relations(permissionCategories, ({ one, many }) => ({
  practice: one(practices, {
    fields: [permissionCategories.practiceId],
    references: [practices.id],
  }),
  resources: many(permissionResources),
}));

export const permissionResourcesRelations = relations(permissionResources, ({ one, many }) => ({
  category: one(permissionCategories, {
    fields: [permissionResources.categoryId],
    references: [permissionCategories.id],
  }),
  actions: many(permissionActions),
}));

export const permissionActionsRelations = relations(permissionActions, ({ one }) => ({
  resource: one(permissionResources, {
    fields: [permissionActions.resourceId],
    references: [permissionResources.id],
  }),
}));
