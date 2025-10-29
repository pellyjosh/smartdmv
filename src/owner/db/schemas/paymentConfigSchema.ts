// src/owner/db/schemas/paymentConfigSchema.ts
import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, boolean, json, serial, integer, decimal } from 'drizzle-orm/pg-core';
import { paymentProviders } from './ownerSchema';

// Owner payment configurations - stores actual API keys and credentials for tenant billing
export const ownerPaymentConfigurations = pgTable('owner_payment_configurations', {
  id: serial('id').primaryKey(),
  
  // Provider Reference
  providerId: integer('provider_id').notNull().references(() => paymentProviders.id, { onDelete: 'cascade' }),
  
  // Configuration Name (for multiple configs of same provider)
  configName: text('config_name').notNull(), // 'Production Stripe', 'Sandbox Paystack', etc.
  
  // Credentials (ENCRYPTED)
  publicKey: text('public_key'), // Encrypted public/publishable key
  secretKey: text('secret_key').notNull(), // Encrypted secret key
  webhookSecret: text('webhook_secret'), // Encrypted webhook secret
  
  // Additional Configuration
  additionalConfig: json('additional_config').$type<{
    merchantId?: string;
    merchantEmail?: string;
    apiVersion?: string;
    customSettings?: Record<string, any>;
  }>(),
  
  // Environment & Currency
  environment: text('environment', { enum: ['production', 'sandbox'] }).notNull().default('sandbox'),
  defaultCurrency: text('default_currency').notNull().default('USD'), // Default currency for this config
  supportedCurrencies: json('supported_currencies').$type<string[]>(), // Override provider defaults if needed
  
  // Status & Validation
  isActive: boolean('is_active').notNull().default(true),
  isDefault: boolean('is_default').notNull().default(false), // Default config for new tenants
  isVerified: boolean('is_verified').notNull().default(false), // Verified by test transaction
  lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
  
  // Usage Restrictions
  allowedForPlans: json('allowed_for_plans').$type<string[]>(), // ['BASIC', 'PROFESSIONAL', 'ENTERPRISE'] or null for all
  maxTenants: integer('max_tenants'), // Limit number of tenants using this config
  
  // Metadata
  notes: text('notes'), // Internal notes about this configuration
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Tenant billing transactions - tracks all billing attempts and payments
export const tenantBillingTransactions = pgTable('tenant_billing_transactions', {
  id: serial('id').primaryKey(),
  
  // Tenant Reference (from ownerSchema tenants table)
  tenantId: integer('tenant_id').notNull(), // References tenants.id but not enforced to avoid circular deps
  
  // Payment Configuration Used
  paymentConfigId: integer('payment_config_id').notNull().references(() => ownerPaymentConfigurations.id),
  
  // Transaction Details
  transactionType: text('transaction_type', { 
    enum: ['subscription', 'addon', 'overage', 'refund', 'credit'] 
  }).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').notNull(),
  
  // Transaction Status
  status: text('status', { 
    enum: ['pending', 'processing', 'succeeded', 'failed', 'refunded', 'canceled'] 
  }).notNull().default('pending'),
  
  // Provider Transaction Reference
  providerTransactionId: text('provider_transaction_id'), // Transaction ID from payment provider
  providerResponse: json('provider_response').$type<Record<string, any>>(), // Full response from provider
  
  // Related Records
  subscriptionId: integer('subscription_id'), // References tenantSubscriptions.id if applicable
  addonId: integer('addon_id'), // References marketplace addon if applicable
  
  // Billing Period
  billingPeriodStart: timestamp('billing_period_start', { withTimezone: true }),
  billingPeriodEnd: timestamp('billing_period_end', { withTimezone: true }),
  
  // Payment Details
  paymentMethod: text('payment_method'), // 'card', 'bank_transfer', 'mobile_money', etc.
  paymentMethodDetails: json('payment_method_details').$type<{
    last4?: string;
    brand?: string;
    expiryMonth?: string;
    expiryYear?: string;
    bankName?: string;
    accountNumber?: string;
  }>(),
  
  // Failure Information
  failureCode: text('failure_code'),
  failureMessage: text('failure_message'),
  retryCount: integer('retry_count').notNull().default(0),
  nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
  
  // Refund Information
  refundedAmount: decimal('refunded_amount', { precision: 10, scale: 2 }),
  refundedAt: timestamp('refunded_at', { withTimezone: true }),
  refundReason: text('refund_reason'),
  
  // Metadata
  description: text('description'), // Human-readable description
  metadata: json('metadata').$type<Record<string, any>>(), // Additional metadata
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const ownerPaymentConfigurationsRelations = relations(ownerPaymentConfigurations, ({ one, many }) => ({
  provider: one(paymentProviders, {
    fields: [ownerPaymentConfigurations.providerId],
    references: [paymentProviders.id],
  }),
  transactions: many(tenantBillingTransactions),
}));

export const tenantBillingTransactionsRelations = relations(tenantBillingTransactions, ({ one }) => ({
  paymentConfig: one(ownerPaymentConfigurations, {
    fields: [tenantBillingTransactions.paymentConfigId],
    references: [ownerPaymentConfigurations.id],
  }),
}));

// Export types
export type OwnerPaymentConfiguration = typeof ownerPaymentConfigurations.$inferSelect;
export type NewOwnerPaymentConfiguration = typeof ownerPaymentConfigurations.$inferInsert;
export type TenantBillingTransaction = typeof tenantBillingTransactions.$inferSelect;
export type NewTenantBillingTransaction = typeof tenantBillingTransactions.$inferInsert;
