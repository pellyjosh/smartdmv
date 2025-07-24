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
};

// Export all schemas and types
export * from './schemas/companiesSchema';
