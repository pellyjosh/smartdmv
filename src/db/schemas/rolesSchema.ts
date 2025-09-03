import { pgTable, serial, varchar, text, boolean, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { practices } from './practicesSchema';
import { userRoles } from './userRolesSchema';

export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  description: text('description'),
  isSystemDefined: boolean('is_system_defined').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  practiceId: integer('practice_id').references(() => practices.id),
  permissions: jsonb('permissions').notNull().default('[]'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const rolesRelations = relations(roles, ({ one, many }) => ({
  practice: one(practices, {
    fields: [roles.practiceId],
    references: [practices.id],
  }),
  userRoles: many(userRoles),
}));

export type SelectRole = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;

export interface RolePermission {
  id: string;
  resource: string;
  action: string;
  granted: boolean;
  category: string;
}

export interface Role {
  id: number;
  name: string;
  displayName: string;
  description?: string;
  isSystemDefined: boolean;
  isActive: boolean;
  practiceId?: number;
  permissions: RolePermission[];
  userCount?: number;
  createdAt: Date;
  updatedAt: Date;
}
