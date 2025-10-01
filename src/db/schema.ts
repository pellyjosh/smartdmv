// src/db/schema.ts
import { users, administratorAccessiblePractices, usersRelations, administratorAccessiblePracticesRelations, UserRoleEnum } from './schemas/usersSchema';
import { practices } from './schemas/practicesSchema';
import { sessions } from './schemas/sessionsSchema';
import { appointments } from './schemas/appointmentsSchema';
import { pets } from './schemas/petsSchema';
import { healthPlans } from './schemas/healthPlansSchema';
import { healthPlanNotes } from './schemas/healthPlanNotesSchema';
import { healthPlanMilestones } from './schemas/healthPlanMilestonesSchema';
import { admissions } from './schemas/admissionsSchema';
import { rooms } from './schemas/roomsSchema';
import { customFieldCategories, customFieldGroups, customFieldValues } from './schemas/customFieldsSchema';
import { soapNotes, soapNotesRelations } from './schemas/soapNoteSchema';
import { soapTemplates } from './schemas/soapNoteTemplateSchema';
import { prescriptions, prescriptionHistory } from './schemas/prescriptionsSchema';
import { treatmentTemplates } from './schemas/treatmentTemplatesSchema';
import { referrals, referralAttachments, referralNotes, referralsRelations, referralAttachmentsRelations, referralNotesRelations, ReferralStatus, ReferralPriority, VetSpecialty } from './schemas/referralsSchema';
import { addons, practiceAddons, addonReviews, AddonCategory } from './schemas/marketplaceSchema';
import { dashboardConfigs, dashboardConfigsRelations } from './schemas/dashboardConfigsSchema';
import { notifications, notificationsRelations } from './schemas/notificationsSchema';
import { contacts, contactsRelations } from './schemas/contactsSchema';
import { 
  labProviderSettings, 
  labTestCatalog, 
  labOrders, 
  labOrderTests, 
  labResults,
  labProviderSettingsRelations,
  labTestCatalogRelations,
  labOrdersRelations,
  labOrderTestsRelations,
  labResultsRelations
} from './schemas/labSchema';
import { treatmentChecklistTemplates, templateItems, assignedChecklists, checklistItems } from './schemas/checklistsSchema';
import {
  kennels,
  boardingStays,
  boardingRequirements,
  feedingSchedules,
  medicationSchedules,
  boardingActivities
} from './schemas/boardingSchema';
import {
  medicalImaging,
  imagingSeries,
  imagingAnnotations,
  imagingMeasurements,
  medicalRecordAttachments,
  electronicSignatures
} from './schemas/medicalImagingSchema';
import {
  aiConfigs,
  aiConfigsRelations
} from './schemas/aiConfigSchema';
import { auditLogs, auditLogsRelations } from './schemas/auditLogsSchema';
import { permissionOverrides } from './schemas/permissionOverridesSchema';
import { 
  permissionCategories, 
  permissionResources, 
  permissionActions,
  permissionCategoriesRelations,
  permissionResourcesRelations,
  permissionActionsRelations
} from './schemas/permissionCategoriesSchema';
import { roles, rolesRelations } from './schemas/rolesSchema';
import { userRoles, userRolesRelations } from './schemas/userRolesSchema';
import {
  vaccineTypes,
  vaccinations,
  vaccineTypesRelations,
  vaccinationsRelations
} from './schemas/vaccinationsSchema';
import {
  integrationSettings,
  widgetAnalytics,
  integrationApiKeys,
  integrationSettingsRelations,
  widgetAnalyticsRelations,
  integrationApiKeysRelations
} from './schemas/integrationSettingsSchema';
import {
  invoices,
  invoiceItems,
  payments,
  paymentMethods,
  invoicesRelations,
  invoiceItemsRelations,
  paymentsRelations,
  paymentMethodsRelations
} from './schemas/billingSchema';
import {
  expenses,
  expenseAttachments,
  expenseAuditLogs,
  refunds,
  payroll,
  expensesRelations,
  expenseAttachmentsRelations,
  expenseAuditLogsRelations,
  refundsRelations,
  payrollRelations,
  payPeriods,
  payPeriodsRelations,
  payRates,
  payRatesRelations,
  workHours,
  workHoursRelations
} from './schemas/financeSchema';
import {
  healthResources,
  healthResourcesRelations
} from './schemas/healthResourcesSchema';

export const schema = {
  users,
  usersRelations,
  pets,
  healthPlans,
  healthPlanNotes,
  healthPlanMilestones,
  practices,
  sessions,
  appointments,
  administratorAccessiblePractices,
  administratorAccessiblePracticesRelations,
  admissions,
  rooms,
  customFieldCategories,
  customFieldGroups,
  customFieldValues,
  soapNotes,
  soapNotesRelations,
  soapTemplates,
  prescriptions,
  prescriptionHistory,
  treatmentTemplates,
  referrals,
  referralAttachments,
  referralNotes,
  referralsRelations,
  referralAttachmentsRelations,
  referralNotesRelations,
  addons,
  practiceAddons,
  addonReviews,
  AddonCategory,
  dashboardConfigs,
  dashboardConfigsRelations,
  notifications,
  notificationsRelations,
  contacts,
  contactsRelations,
  // Lab tables
  labProviderSettings, 
  labProviderSettingsRelations,
  labTestCatalog, 
  labTestCatalogRelations,
  labOrders, 
  labOrdersRelations,
  labOrderTests, 
  labOrderTestsRelations,
  labResults,
  labResultsRelations,
  permissionOverrides,
  roles,
  userRoles,
  // Boarding tables
  kennels,
  boardingStays,
  boardingRequirements,
  feedingSchedules,
  medicationSchedules,
  boardingActivities,
  // Medical Imaging tables
  medicalImaging,
  imagingSeries,
  imagingAnnotations,
  imagingMeasurements,
  medicalRecordAttachments,
  electronicSignatures,
  rolesRelations,
  userRolesRelations,
  // AI Configuration tables
  aiConfigs,
  aiConfigsRelations,
  // Vaccination tables
  vaccineTypes,
  vaccineTypesRelations,
  vaccinations,
  vaccinationsRelations,
  // Checklists tables
  treatmentChecklistTemplates,
  templateItems,
  assignedChecklists,
  checklistItems,
  // Integration settings tables
  integrationSettings,
  integrationSettingsRelations,
  widgetAnalytics,
  widgetAnalyticsRelations,
  integrationApiKeys,
  integrationApiKeysRelations,
  // Audit logs
  auditLogs,
  auditLogsRelations,
  // Permission categories
  permissionCategories,
  permissionCategoriesRelations,
  permissionResources,
  permissionResourcesRelations,
  permissionActions,
  permissionActionsRelations,
  // Billing tables
  invoices,
  invoicesRelations,
  invoiceItems,
  invoiceItemsRelations,
  payments,
  paymentsRelations,
  paymentMethods,
  paymentMethodsRelations,
  // Finance tables
  expenses,
  expensesRelations,
  expenseAttachments,
  expenseAttachmentsRelations,
  expenseAuditLogs,
  expenseAuditLogsRelations,
  refunds,
  refundsRelations,
  payroll,
  payrollRelations,
  payPeriods,
  payPeriodsRelations,
  payRates,
  payRatesRelations,
  workHours,
  workHoursRelations,
  // Health Resources tables
  healthResources,
  healthResourcesRelations,
};

// Re-export all tables and their relations for Drizzle to use
export * from './schemas/dashboardConfigsSchema';
export * from './schemas/practicesSchema';
export * from './schemas/sessionsSchema';
export * from './schemas/usersSchema';
export * from './schemas/appointmentsSchema';
export * from './schemas/petsSchema';
export * from './schemas/healthPlansSchema';
export * from './schemas/healthPlanNotesSchema';
export * from './schemas/healthPlanMilestonesSchema';
export * from './schemas/admissionsSchema';
export * from './schemas/roomsSchema';
export * from './schemas/customFieldsSchema';
export * from './schemas/soapNoteSchema';
export * from './schemas/soapNoteTemplateSchema';
export * from './schemas/prescriptionsSchema';
export * from './schemas/treatmentsSchema';
export * from './schemas/whiteboardItemsSchema';
export * from './schemas/whiteboardNotesSchema';
export * from './schemas/inventorySchema';
export * from './schemas/inventoryTransactionsSchema';
export * from './schemas/medicationInteractionsSchema';
export * from './schemas/treatmentTemplatesSchema';
export * from './schemas/referralsSchema';
export * from './schemas/marketplaceSchema';
export * from './schemas/notificationsSchema';
export * from './schemas/contactsSchema';
export * from './schemas/labSchema';
export * from './schemas/boardingSchema';
export * from './schemas/medicalImagingSchema';
export * from './schemas/aiConfigSchema';
export * from './schemas/vaccinationsSchema';
export * from './schemas/checklistsSchema';
export * from './schemas/integrationSettingsSchema';
export * from './schemas/auditLogsSchema';
export * from './schemas/permissionOverridesSchema';
export * from './schemas/permissionCategoriesSchema';
export * from './schemas/rolesSchema';
export * from './schemas/userRolesSchema';
export * from './schemas/permissionOverridesSchema';
export * from './schemas/rolesSchema';
export * from './schemas/userRolesSchema';
export * from './schemas/billingSchema';
export * from './schemas/financeSchema';
export * from './schemas/healthResourcesSchema';

// You might also want to re-export the userRoleEnum if it's used elsewhere for typing
export { UserRoleEnum };
