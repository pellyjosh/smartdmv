
// schema/usersSchema.ts
import { dbTable, text, timestamp, primaryKey } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { practices } from './practicesSchema';
import { sessions } from './sessionsSchema';

const isSqlite = process.env.DB_TYPE === 'sqlite';

// export enum UserRoleEnum = ['CLIENT', 'PRACTICE_ADMINISTRATOR', 'ADMINISTRATOR', 'VETERINARIAN', 'TECHNICIAN', 'RECEPTIONIST', 'PRACTICE_MANAGER', 'PRACTICE_ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'] as const;
export enum UserRoleEnum {
  CLIENT = 'CLIENT',
  PRACTICE_ADMINISTRATOR = 'PRACTICE_ADMINISTRATOR',
  ADMINISTRATOR = 'ADMINISTRATOR',
  VETERINARIAN = 'VETERINARIAN',
  TECHNICIAN = 'TECHNICIAN',
  RECEPTIONIST = 'RECEPTIONIST',
  PRACTICE_MANAGER = 'PRACTICE_MANAGER',
  PRACTICE_ADMIN = 'PRACTICE_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN', // Assuming this is also a role
  ACCOUNTANT = 'ACCOUNTANT',
  CASHIER = 'CASHIER', // Add any missing roles from your full list
  OFFICE_MANAGER = 'OFFICE_MANAGER', // Add any missing roles
}

export type UserRole = `${UserRoleEnum}`;
export const userRoleEnumValues = Object.values(UserRoleEnum);

export const users = dbTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
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
  role: text('role', { enum: userRoleEnumValues }).notNull(),
  practiceId: text('practice_id').references(() => practices.id as any, { onDelete: 'set null' }),
  currentPracticeId: text('current_practice_id').references(() => practices.id as any, { onDelete: 'set null' }),

  createdAt: isSqlite
    ? timestamp('createdAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),

  updatedAt: isSqlite
    ? timestamp('updatedAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`).$onUpdate(() => sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdateFn(() => new Date()),
});

export const administratorAccessiblePractices = dbTable('administrator_accessible_practices', {
  administratorId: text('administrator_id').notNull().references(() => users.id as any, { onDelete: 'cascade' }),
  practiceId: text('practice_id').notNull().references(() => practices.id as any, { onDelete: 'cascade' }),

  assignedAt: isSqlite
    ? timestamp('assignedAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('assignedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),

  createdAt: isSqlite
    ? timestamp('createdAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('createdAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),

  updatedAt: isSqlite
    ? timestamp('updatedAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`).$onUpdate(() => sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdateFn(() => new Date()),
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
  id: string;
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
  practiceId: string | null;
  currentPracticeId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdministratorAccessiblePractice {
  administratorId: string;
  practiceId: string;
}
