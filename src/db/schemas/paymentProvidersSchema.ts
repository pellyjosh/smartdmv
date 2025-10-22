// src/db/schemas/paymentProvidersSchema.ts
// Tenant-specific payment provider configurations

import { dbTable, text, timestamp, primaryKeyId, boolean, jsonb, foreignKeyInt } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { practices } from './practicesSchema';
import { users } from './usersSchema';

// Practice-specific payment provider configurations
export const practicePaymentProviders = dbTable('practice_payment_providers', {
  id: primaryKeyId(),
  
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id, { onDelete: 'cascade' }),
  
  // Provider Reference (from Owner DB catalog)
  providerCode: text('provider_code').notNull(), // 'stripe', 'paystack', etc.
  providerName: text('provider_name').notNull(), // Cached from owner DB for display
  
  // Practice-Specific Configuration
  isEnabled: boolean('is_enabled').notNull().default(false),
  isDefault: boolean('is_default').notNull().default(false), // Default provider for this practice
  
  // API Credentials (Should be encrypted in production)
  publicKey: text('public_key'), // Encrypted
  secretKey: text('secret_key'), // Encrypted
  webhookSecret: text('webhook_secret'), // Encrypted
  
  // Environment
  environment: text('environment', { 
    enum: ['sandbox', 'production'] 
  }).notNull().default(sql`'sandbox'`),
  
  // Additional Configuration
  config: jsonb('config').$type<{
    merchantId?: string;
    accountId?: string;
    customSettings?: Record<string, any>;
  }>(), // Provider-specific settings
  
  // Priority (if multiple providers support the same currency)
  priority: text('priority').notNull().default(sql`'0'`), // Higher priority is preferred
  
  // Testing & Validation
  lastTestedAt: timestamp('last_tested_at', { mode: 'date' }),
  testResults: jsonb('test_results').$type<{
    success?: boolean;
    message?: string;
    timestamp?: string;
  }>(),
  
  // Metadata
  configuredBy: foreignKeyInt('configured_by').references(() => users.id), // User who set it up
  lastUsedAt: timestamp('last_used_at', { mode: 'date' }),
  totalTransactions: text('total_transactions').default(sql`'0'`),
  totalAmount: text('total_amount').default(sql`'0'`),
  
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull().$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

// Relations
export const practicePaymentProvidersRelations = relations(practicePaymentProviders, ({ one }) => ({
  practice: one(practices, {
    fields: [practicePaymentProviders.practiceId],
    references: [practices.id],
  }),
  configuredByUser: one(users, {
    fields: [practicePaymentProviders.configuredBy],
    references: [users.id],
  }),
}));

// Add relation to practices
export const practicesPaymentProvidersRelation = relations(practices, ({ many }) => ({
  paymentProviders: many(practicePaymentProviders),
}));

// Types
export interface PracticePaymentProvider {
  id: string;
  practiceId: number;
  providerCode: string;
  providerName: string;
  isEnabled: boolean;
  isDefault: boolean;
  publicKey: string | null;
  secretKey: string | null;
  webhookSecret: string | null;
  environment: 'sandbox' | 'production';
  config: {
    merchantId?: string;
    accountId?: string;
    customSettings?: Record<string, any>;
  } | null;
  priority: string;
  lastTestedAt: Date | null;
  testResults: {
    success?: boolean;
    message?: string;
    timestamp?: string;
  } | null;
  configuredBy: number | null;
  lastUsedAt: Date | null;
  totalTransactions: string;
  totalAmount: string;
  createdAt: Date;
  updatedAt: Date;
}

export type NewPracticePaymentProvider = typeof practicePaymentProviders.$inferInsert;
