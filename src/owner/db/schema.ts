// src/owner/db/schema.ts
import {
  ownerUsers,
  tenants,
  tenantDomains,
  subscriptionPlans,
  tenantSubscriptions,
  tenantUsage,
  ownerSessions,
  systemSettings,
  paymentProviders,
  providerCurrencySupport,
  tenantsRelations,
  tenantDomainsRelations,
  tenantSubscriptionsRelations,
  tenantUsageRelations,
  ownerSessionsRelations,
  paymentProvidersRelations,
  providerCurrencySupportRelations,
} from './schemas/ownerSchema';

import {
  ownerPaymentConfigurations,
  tenantBillingTransactions,
  ownerPaymentConfigurationsRelations,
  tenantBillingTransactionsRelations,
} from './schemas/paymentConfigSchema';

export const ownerSchema = {
  // User Management
  ownerUsers,
  ownerSessions,
  
  // Tenant Management
  tenants,
  tenantDomains,
  tenantUsage,
  
  // Subscriptions
  subscriptionPlans,
  tenantSubscriptions,
  
  // Payment Infrastructure
  paymentProviders,
  providerCurrencySupport,
  ownerPaymentConfigurations,
  tenantBillingTransactions,
  
  // System
  systemSettings,
  
  // Relations
  tenantsRelations,
  tenantDomainsRelations,
  tenantSubscriptionsRelations,
  tenantUsageRelations,
  ownerSessionsRelations,
  paymentProvidersRelations,
  providerCurrencySupportRelations,
  ownerPaymentConfigurationsRelations,
  tenantBillingTransactionsRelations,
};

// Export all schemas and types
export * from './schemas/ownerSchema';
export * from './schemas/paymentConfigSchema';

