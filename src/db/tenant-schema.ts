// src/db/tenant-schema.ts
// Tenant-specific database schema (excludes owner-specific fields like tenantId)

import { dbTable, text, timestamp, primaryKey, primaryKeyId, foreignKeyInt, foreignKeyText } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
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
import { invoices, invoiceItems, paymentMethods, payments } from './schemas/billingSchema';
import { auditLogs } from './schemas/auditLogsSchema';
// Finance / Payroll imports (added)
import { 
  expenses,
  expenseAttachments,
  expenseAuditLogs,
  refunds,
  payPeriods,
  payRates,
  workHours,
  payroll,
  budgets
} from './schemas/financeSchema';

// User roles for tenant databases (excludes OWNER which is only in owner DB)
export enum TenantUserRoleEnum {
  CLIENT = 'CLIENT',
  PRACTICE_ADMINISTRATOR = 'PRACTICE_ADMINISTRATOR',
  ADMINISTRATOR = 'ADMINISTRATOR',
  VETERINARIAN = 'VETERINARIAN',
  TECHNICIAN = 'TECHNICIAN',
  RECEPTIONIST = 'RECEPTIONIST',
  PRACTICE_MANAGER = 'PRACTICE_MANAGER',
  PRACTICE_ADMIN = 'PRACTICE_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  ACCOUNTANT = 'ACCOUNTANT',
  CASHIER = 'CASHIER',
  OFFICE_MANAGER = 'OFFICE_MANAGER',
  COMPANY_ADMIN = 'COMPANY_ADMIN',
}

export type TenantUserRole = `${TenantUserRoleEnum}`;
export const tenantUserRoleEnumValues = Object.values(TenantUserRoleEnum);

// Tenant users table (excludes tenantId - each tenant has their own DB)
export const users = dbTable('users', {
  id: primaryKeyId(),
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
  role: text('role', { enum: tenantUserRoleEnumValues as [string, ...string[]] }).notNull(),
  // Note: No tenantId field - each tenant has their own database
  practiceId: foreignKeyInt('practice_id').references(() => practices.id, { onDelete: 'set null' }),
  currentPracticeId: foreignKeyInt('current_practice_id').references(() => practices.id, { onDelete: 'set null' }),

  createdAt: timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const administratorAccessiblePractices = dbTable('administrator_accessible_practices', {
  administratorId: foreignKeyInt('administrator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id, { onDelete: 'cascade' }),

  assignedAt: timestamp('assignedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: primaryKey({ columns: [table.administratorId, table.practiceId] })
}));

// Users relations
export const usersRelations = relations(users, ({ one, many }) => ({
  sessions: many(sessions),
  practice: one(practices, {
    fields: [users.practiceId],
    references: [practices.id]
  }),
  currentPractice: one(practices, {
    fields: [users.currentPracticeId],
    references: [practices.id]
  }),
  administratorAccessiblePractices: many(administratorAccessiblePractices),
}));

export const administratorAccessiblePracticesRelations = relations(administratorAccessiblePractices, ({ one }) => ({
  user: one(users, {
    fields: [administratorAccessiblePractices.administratorId],
    references: [users.id]
  }),
  practice: one(practices, {
    fields: [administratorAccessiblePractices.practiceId],
    references: [practices.id]
  })
}));

// Export all schemas and relations for tenant databases
export {
  practices,
  sessions,
  appointments,
  pets,
  healthPlans,
  healthPlanNotes,
  healthPlanMilestones,
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
  ReferralStatus,
  ReferralPriority,
  VetSpecialty,
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
  labProviderSettings,
  labTestCatalog,
  labOrders,
  labOrderTests,
  labResults,
  labProviderSettingsRelations,
  labTestCatalogRelations,
  labOrdersRelations,
  labOrderTestsRelations,
  labResultsRelations,
  treatmentChecklistTemplates,
  templateItems,
  assignedChecklists,
  checklistItems,
  kennels,
  boardingStays,
  boardingRequirements,
  feedingSchedules,
  medicationSchedules,
  boardingActivities,
  medicalImaging,
  imagingSeries,
  imagingAnnotations,
  imagingMeasurements,
  medicalRecordAttachments,
  electronicSignatures,
  invoices,
  paymentMethods,
  payments,
  auditLogs,
  // Finance tables
  expenses,
  expenseAttachments,
  expenseAuditLogs,
  refunds,
  payPeriods,
  payRates,
  workHours,
  payroll,
  budgets,
};

// Combined export for tenant schema
export const tenantSchema = {
  users,
  administratorAccessiblePractices,
  usersRelations,
  administratorAccessiblePracticesRelations,
  practices,
  sessions,
  appointments,
  pets,
  healthPlans,
  healthPlanNotes,
  healthPlanMilestones,
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
  dashboardConfigs,
  dashboardConfigsRelations,
  notifications,
  notificationsRelations,
  contacts,
  contactsRelations,
  labProviderSettings,
  labTestCatalog,
  labOrders,
  labOrderTests,
  labResults,
  labProviderSettingsRelations,
  labTestCatalogRelations,
  labOrdersRelations,
  labOrderTestsRelations,
  labResultsRelations,
  treatmentChecklistTemplates,
  templateItems,
  assignedChecklists,
  checklistItems,
  kennels,
  boardingStays,
  boardingRequirements,
  feedingSchedules,
  medicationSchedules,
  boardingActivities,
  medicalImaging,
  imagingSeries,
  imagingAnnotations,
  imagingMeasurements,
  medicalRecordAttachments,
  electronicSignatures,
  invoices,
  paymentMethods,
  payments,
  auditLogs,
  // Finance tables
  expenses,
  expenseAttachments,
  expenseAuditLogs,
  refunds,
  payPeriods,
  payRates,
  workHours,
  payroll,
  budgets,
};
