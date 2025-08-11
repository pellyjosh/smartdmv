// src/db/schemas/companySchema.ts
import { pgTable, varchar, decimal, pgEnum, uuid } from 'drizzle-orm/pg-core';
import { dbTable, text, timestamp, integer, boolean, primaryKeyId, foreignKeyInt } from '@/db/db.config';
import { relations } from 'drizzle-orm';

// Company subscription status enum
export const SubscriptionStatusEnum = pgEnum('subscription_status', [
  'TRIAL',
  'ACTIVE',
  'SUSPENDED',
  'CANCELLED',
  'EXPIRED'
]);

// Company subscription plan enum
export const SubscriptionPlanEnum = pgEnum('subscription_plan', [
  'STARTER',
  'PROFESSIONAL',
  'ENTERPRISE',
  'CUSTOM'
]);

// Companies table (for the central owner database)
export const companies = pgTable('companies', {
  id: primaryKeyId(),
  name: varchar('name', { length: 255 }).notNull(),
  subdomain: varchar('subdomain', { length: 100 }).notNull().unique(), // e.g., "abc-vet" for abc-vet.smartdmv.com
  databaseName: varchar('database_name', { length: 100 }).notNull().unique(), // The dedicated database name for this company
  contactEmail: varchar('contact_email', { length: 255 }).notNull(),
  contactPhone: varchar('contact_phone', { length: 50 }),
  address: text('address'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Company subscriptions table
export const companySubscriptions = pgTable('company_subscriptions', {
  id: primaryKeyId(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  plan: SubscriptionPlanEnum('plan').notNull(),
  status: SubscriptionStatusEnum('status').default('TRIAL').notNull(),
  monthlyPrice: decimal('monthly_price', { precision: 10, scale: 2 }),
  yearlyPrice: decimal('yearly_price', { precision: 10, scale: 2 }),
  billingCycle: varchar('billing_cycle', { length: 20 }).default('MONTHLY'), // MONTHLY, YEARLY
  trialEndsAt: timestamp('trial_ends_at'),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelledAt: timestamp('cancelled_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Company users table (for owner/admin users)
export const companyUsers = pgTable('company_users', {
  id: primaryKeyId(),
  companyId: uuid('company_id').references(() => companies.id),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  role: varchar('role', { length: 50 }).default('OWNER').notNull(), // OWNER, COMPANY_ADMIN
  passwordHash: varchar('password_hash', { length: 255 }),
  isActive: boolean('is_active').default(true).notNull(),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Company database configurations
export const companyDatabases = pgTable('company_databases', {
  id: primaryKeyId(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  databaseName: varchar('database_name', { length: 100 }).notNull(),
  connectionString: text('connection_string').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const companiesRelations = relations(companies, ({ many, one }) => ({
  subscription: one(companySubscriptions, {
    fields: [companies.id],
    references: [companySubscriptions.companyId],
  }),
  users: many(companyUsers),
  database: one(companyDatabases, {
    fields: [companies.id],
    references: [companyDatabases.companyId],
  }),
}));

export const companySubscriptionsRelations = relations(companySubscriptions, ({ one }) => ({
  company: one(companies, {
    fields: [companySubscriptions.companyId],
    references: [companies.id],
  }),
}));

export const companyUsersRelations = relations(companyUsers, ({ one }) => ({
  company: one(companies, {
    fields: [companyUsers.companyId],
    references: [companies.id],
  }),
}));

export const companyDatabasesRelations = relations(companyDatabases, ({ one }) => ({
  company: one(companies, {
    fields: [companyDatabases.companyId],
    references: [companies.id],
  }),
}));
