// src/owner/db/schema.ts
import {
  companies,
  companyDatabases,
  companyUsers,
  subscriptions,
  billingHistory,
  companiesRelations,
  companyDatabasesRelations,
  companyUsersRelations,
  subscriptionsRelations,
  billingHistoryRelations,
} from './schemas/companiesSchema';

import {
  paymentProviders,
  providerCurrencySupport,
  paymentProvidersRelations,
  providerCurrencySupportRelations,
} from '@/db/owner-schema';

export const ownerSchema = {
  companies,
  companyDatabases,
  companyUsers,
  subscriptions,
  billingHistory,
  companiesRelations,
  companyDatabasesRelations,
  companyUsersRelations,
  subscriptionsRelations,
  billingHistoryRelations,
  paymentProviders,
  providerCurrencySupport,
  paymentProvidersRelations,
  providerCurrencySupportRelations,
};

// Export all schemas and types
export * from './schemas/companiesSchema';
