// src/db/schema.ts
import { users, administratorAccessiblePractices, UserRoleEnum } from './schemas/usersSchema';
import { practices } from './schemas/practicesSchema';
import { sessions } from './schemas/sessionsSchema';
import { appointments } from './schemas/appointmentsSchema';
import { pets } from './schemas/petsSchema';
import { healthPlans } from './schemas/healthPlansSchema';
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

export const schema = {
  users,
  pets,
  healthPlans,
  practices,
  sessions,
  appointments,
  administratorAccessiblePractices,
  admissions,
  rooms,
  customFieldCategories,
  customFieldGroups,
  customFieldValues,
  soapNotes,
  soapTemplates,
  prescriptions,
  prescriptionHistory,
  treatmentTemplates,
  referrals,
  referralAttachments,
  referralNotes,
  addons,
  practiceAddons,
  addonReviews,
  AddonCategory,
  dashboardConfigs,
  notifications,
  // Lab tables
  labProviderSettings, 
  labTestCatalog, 
  labOrders, 
  labOrderTests, 
  labResults,
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
  // AI Configuration tables
  aiConfigs
};

// Re-export all tables and their relations for Drizzle to use
export * from './schemas/dashboardConfigsSchema';
export * from './schemas/practicesSchema';
export * from './schemas/sessionsSchema';
export * from './schemas/usersSchema';
export * from './schemas/appointmentsSchema';
export * from './schemas/petsSchema';
export * from './schemas/healthPlansSchema';
export * from './schemas/admissionsSchema';
export * from './schemas/roomsSchema';
export * from './schemas/customFieldsSchema';
export * from './schemas/soapNoteSchema';
export * from './schemas/soapNoteTemplateSchema';
export * from './schemas/prescriptionsSchema';
export * from './schemas/treatmentsSchema';
export * from './schemas/whiteboardItemsSchema';
export * from './schemas/inventorySchema';
export * from './schemas/treatmentTemplatesSchema';
export * from './schemas/referralsSchema';
export * from './schemas/marketplaceSchema';
export * from './schemas/notificationsSchema';
export * from './schemas/labSchema';
export * from './schemas/boardingSchema';
export * from './schemas/medicalImagingSchema';
export * from './schemas/aiConfigSchema';

// You might also want to re-export the userRoleEnum if it's used elsewhere for typing
export { UserRoleEnum };
