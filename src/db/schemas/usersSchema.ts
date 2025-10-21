
// schema/usersSchema.ts
import { dbTable, text, timestamp, primaryKey, primaryKeyId, foreignKeyInt, foreignKeyText } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { practices } from './practicesSchema';
import { sessions } from './sessionsSchema';

// Note: userRoles import will be added later to avoid circular dependency

export enum UserRoleEnum {
  CLIENT = 'CLIENT',
  PRACTICE_ADMINISTRATOR = 'PRACTICE_ADMINISTRATOR',
  ADMINISTRATOR = 'ADMINISTRATOR',
  PRACTICE_STAFF = 'PRACTICE_STAFF',
  VETERINARIAN = 'VETERINARIAN',
  TECHNICIAN = 'TECHNICIAN',
  RECEPTIONIST = 'RECEPTIONIST',
  PRACTICE_MANAGER = 'PRACTICE_MANAGER',
  PRACTICE_ADMIN = 'PRACTICE_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  ACCOUNTANT = 'ACCOUNTANT',
  CASHIER = 'CASHIER',
  OFFICE_MANAGER = 'OFFICE_MANAGER',
  OWNER = 'OWNER',
  COMPANY_ADMIN = 'COMPANY_ADMIN',
}

export type UserRole = `${UserRoleEnum}`;
export const userRoleEnumValues = Object.values(UserRoleEnum);

export const users = dbTable('users', {
  id: primaryKeyId(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  name: text('name'),
  password: text('password').notNull(),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zipCode: text('zip_code'),
  country: text('country'),
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactPhone: text('emergency_contact_phone'),
  emergencyContactRelationship: text('emergency_contact_relationship'),
  role: text('role', { enum: userRoleEnumValues as [string, ...string[]] }).notNull(),
  practiceId: foreignKeyInt('practice_id').references(() => practices.id, { onDelete: 'set null' }),
  currentPracticeId: foreignKeyInt('current_practice_id').references(() => practices.id, { onDelete: 'set null' }),

  createdAt: timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const administratorAccessiblePractices = dbTable('administrator_accessible_practices', {
  administratorId: foreignKeyInt('administrator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id, { onDelete: 'cascade' }),

  assignedAt: timestamp('assignedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
}, (table: { administratorId: any; practiceId: any; }) => ({
  pk: primaryKey({ columns: [table.administratorId, table.practiceId] }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  assignedPractice: one(practices, {
    fields: [users.practiceId],
    references: [practices.id],
    relationName: 'usersPracticeRelation',
  }),
  currentSelectedPractice: one(practices, {
    fields: [users.currentPracticeId],
    references: [practices.id],
    relationName: 'usersCurrentPracticeRelation',
  }),
  accessiblePractices: many(administratorAccessiblePractices),
  sessions: many(sessions),
  // Note: userRoles relation will be defined in userRolesSchema to avoid circular imports
}));

export const administratorAccessiblePracticesRelations = relations(administratorAccessiblePractices, ({ one }) => ({
  administrator: one(users, {
    fields: [administratorAccessiblePractices.administratorId],
    references: [users.id],
  }),
  practice: one(practices, {
    fields: [administratorAccessiblePractices.practiceId],
    references: [practices.id],
  }),
}));

export interface User {
  id: number;
  email: string;
  username: string;
  name: string | null;
  password: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
  role: UserRole;
  practiceId: number | null;
  currentPracticeId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdministratorAccessiblePractice {
  administratorId: number;
  practiceId: number;
}
