// src/db/owner-schema.ts
import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, boolean, json, serial, integer } from 'drizzle-orm/pg-core';

// Owner users table - separate from tenant users
export const ownerUsers = pgTable('owner_users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  name: text('name'),
  password: text('password').notNull(),
  phone: text('phone'),
  role: text('role', { enum: ['OWNER', 'COMPANY_ADMIN'] }).notNull().default('OWNER'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Tenants table - core tenant management
export const tenants = pgTable('tenants', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  subdomain: text('subdomain').notNull().unique(), // abc-vet
  customDomain: text('custom_domain'), // abc-vet.com
  dbHost: text('db_host').notNull().default('localhost'), // Database host
  dbName: text('db_name').notNull(), // tenant_abc_vet
  dbPort: integer('db_port').notNull().default(5432),
  dbUser: text('db_user'), // Optional separate DB user
  dbPassword: text('db_password'), // Encrypted password for tenant DB
  storagePath: text('storage_path').notNull(), // tenants/abc-vet
  status: text('status', { enum: ['ACTIVE', 'SUSPENDED', 'INACTIVE', 'PENDING'] }).notNull().default('PENDING'),
  plan: text('plan', { enum: ['BASIC', 'PROFESSIONAL', 'ENTERPRISE'] }).notNull().default('BASIC'),
  settings: json('settings').$type<{
    maxPractices?: number;
    maxUsers?: number;
    features?: string[];
    branding?: {
      logo?: string;
      primaryColor?: string;
      secondaryColor?: string;
    };
    limits?: {
      storage?: string; // '1GB', '10GB', etc.
      apiCalls?: number;
      fileUploads?: number;
    };
  }>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Tenant domains table
export const tenantDomains = pgTable('tenant_domains', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  domain: text('domain').notNull().unique(),
  isPrimary: boolean('is_primary').notNull().default(false),
  isVerified: boolean('is_verified').notNull().default(false),
  sslEnabled: boolean('ssl_enabled').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Subscription plans
export const subscriptionPlans = pgTable('subscription_plans', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(), // 'Basic', 'Professional', 'Enterprise'
  price: text('price').notNull(), // '29.99'
  currency: text('currency').notNull().default('USD'),
  interval: text('interval', { enum: ['monthly', 'yearly'] }).notNull(),
  features: json('features').$type<string[]>(),
  limits: json('limits').$type<{
    maxPractices?: number;
    maxUsers?: number;
    storage?: string;
    apiCalls?: number;
  }>(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Tenant subscriptions
export const tenantSubscriptions = pgTable('tenant_subscriptions', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  planId: integer('plan_id').notNull().references(() => subscriptionPlans.id),
  status: text('status', { enum: ['ACTIVE', 'PAST_DUE', 'CANCELED', 'SUSPENDED'] }).notNull(),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),
  trialEnd: timestamp('trial_end', { withTimezone: true }),
  stripeSubscriptionId: text('stripe_subscription_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Tenant usage tracking
export const tenantUsage = pgTable('tenant_usage', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  month: text('month').notNull(), // '2025-09'
  userCount: integer('user_count').notNull().default(0),
  practiceCount: integer('practice_count').notNull().default(0),
  storageUsed: text('storage_used').notNull().default('0'), // '1.5GB'
  apiCalls: integer('api_calls').notNull().default(0),
  fileUploads: integer('file_uploads').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Owner sessions table
export const ownerSessions = pgTable('owner_sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => ownerUsers.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// System settings for the owner dashboard
export const systemSettings = pgTable('system_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: json('value'),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const tenantsRelations = relations(tenants, ({ many, one }) => ({
  domains: many(tenantDomains),
  subscription: one(tenantSubscriptions),
  usage: many(tenantUsage),
}));

export const tenantDomainsRelations = relations(tenantDomains, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantDomains.tenantId],
    references: [tenants.id],
  }),
}));

export const tenantSubscriptionsRelations = relations(tenantSubscriptions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantSubscriptions.tenantId],
    references: [tenants.id],
  }),
  plan: one(subscriptionPlans, {
    fields: [tenantSubscriptions.planId],
    references: [subscriptionPlans.id],
  }),
}));

export const tenantUsageRelations = relations(tenantUsage, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantUsage.tenantId],
    references: [tenants.id],
  }),
}));

export const ownerSessionsRelations = relations(ownerSessions, ({ one }) => ({
  user: one(ownerUsers, {
    fields: [ownerSessions.userId],
    references: [ownerUsers.id],
  }),
}));

// Types
export type OwnerUser = typeof ownerUsers.$inferSelect;
export type NewOwnerUser = typeof ownerUsers.$inferInsert;
export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type TenantDomain = typeof tenantDomains.$inferSelect;
export type NewTenantDomain = typeof tenantDomains.$inferInsert;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type NewSubscriptionPlan = typeof subscriptionPlans.$inferInsert;
export type TenantSubscription = typeof tenantSubscriptions.$inferSelect;
export type NewTenantSubscription = typeof tenantSubscriptions.$inferInsert;
export type TenantUsage = typeof tenantUsage.$inferSelect;
export type NewTenantUsage = typeof tenantUsage.$inferInsert;
