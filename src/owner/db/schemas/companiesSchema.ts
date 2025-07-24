// src/owner/db/schemas/companiesSchema.ts
import { serial, varchar, text, timestamp, boolean, json } from 'drizzle-orm/pg-core';
import { pgTable } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const companies = pgTable('companies', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  subdomain: varchar('subdomain', { length: 100 }).notNull().unique(),
  contactEmail: varchar('contact_email', { length: 255 }).notNull(),
  contactPhone: varchar('contact_phone', { length: 50 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 50 }),
  zipCode: varchar('zip_code', { length: 20 }),
  country: varchar('country', { length: 100 }).default('US'),
  isActive: boolean('is_active').default(true),
  subscriptionStatus: varchar('subscription_status', { 
    enum: ['trial', 'active', 'suspended', 'cancelled'] 
  }).default('trial'),
  billingSettings: json('billing_settings'),
  metadata: json('metadata'), // For storing additional company-specific data
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const companyDatabases = pgTable('company_databases', {
  id: serial('id').primaryKey(),
  companyId: serial('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  databaseName: varchar('database_name', { length: 100 }).notNull(),
  connectionString: text('connection_string').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const companyUsers = pgTable('company_users', {
  id: serial('id').primaryKey(),
  companyId: serial('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  role: varchar('role', { 
    enum: ['OWNER', 'COMPANY_ADMIN'] 
  }).notNull(),
  passwordHash: text('password_hash').notNull(),
  isActive: boolean('is_active').default(true),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  companyId: serial('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  planId: varchar('plan_id', { length: 100 }).notNull(),
  planName: varchar('plan_name', { length: 255 }).notNull(),
  status: varchar('status', { 
    enum: ['trial', 'active', 'past_due', 'cancelled', 'suspended'] 
  }).default('trial'),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  trialEnd: timestamp('trial_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  pricePerMonth: varchar('price_per_month', { length: 20 }),
  currency: varchar('currency', { length: 3 }).default('USD'),
  maxUsers: varchar('max_users', { length: 10 }),
  maxPractices: varchar('max_practices', { length: 10 }),
  features: json('features'), // Array of enabled features
  metadata: json('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const billingHistory = pgTable('billing_history', {
  id: serial('id').primaryKey(),
  companyId: serial('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  subscriptionId: serial('subscription_id').references(() => subscriptions.id),
  amount: varchar('amount', { length: 20 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),
  status: varchar('status', { 
    enum: ['pending', 'paid', 'failed', 'refunded'] 
  }).notNull(),
  invoiceId: varchar('invoice_id', { length: 255 }),
  paymentMethod: varchar('payment_method', { length: 100 }),
  billingPeriodStart: timestamp('billing_period_start'),
  billingPeriodEnd: timestamp('billing_period_end'),
  paidAt: timestamp('paid_at'),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const companiesRelations = relations(companies, ({ many, one }) => ({
  companyDatabases: many(companyDatabases),
  companyUsers: many(companyUsers),
  subscriptions: many(subscriptions),
  billingHistory: many(billingHistory),
}));

export const companyDatabasesRelations = relations(companyDatabases, ({ one }) => ({
  company: one(companies, {
    fields: [companyDatabases.companyId],
    references: [companies.id],
  }),
}));

export const companyUsersRelations = relations(companyUsers, ({ one }) => ({
  company: one(companies, {
    fields: [companyUsers.companyId],
    references: [companies.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  company: one(companies, {
    fields: [subscriptions.companyId],
    references: [companies.id],
  }),
  billingHistory: many(billingHistory),
}));

export const billingHistoryRelations = relations(billingHistory, ({ one }) => ({
  company: one(companies, {
    fields: [billingHistory.companyId],
    references: [companies.id],
  }),
  subscription: one(subscriptions, {
    fields: [billingHistory.subscriptionId],
    references: [subscriptions.id],
  }),
}));

// Export types
export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type CompanyDatabase = typeof companyDatabases.$inferSelect;
export type NewCompanyDatabase = typeof companyDatabases.$inferInsert;
export type CompanyUser = typeof companyUsers.$inferSelect;
export type NewCompanyUser = typeof companyUsers.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type BillingHistory = typeof billingHistory.$inferSelect;
export type NewBillingHistory = typeof billingHistory.$inferInsert;
