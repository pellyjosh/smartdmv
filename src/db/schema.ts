// src/db/schema.ts
import { users, administratorAccessiblePractices, UserRoleEnum } from './schemas/usersSchema';
import { practices } from './schemas/practicesSchema';
import { sessions } from './schemas/sessionsSchema';
import { appointments } from './schemas/appointmentsSchema';
import { pets } from './schemas/petsSchema';
import { admissions } from './schemas/admissionsSchema';
import { rooms } from './schemas/roomsSchema';
import { customFieldCategories, customFieldGroups, customFieldValues } from './schemas/customFieldsSchema';
import { soapNotes } from './schemas/soapNoteSchema';
import { treatmentTemplates } from './schemas/treatmentTemplatesSchema';
import { referrals, referralAttachments, referralNotes, referralsRelations, referralAttachmentsRelations, referralNotesRelations, ReferralStatus, ReferralPriority, VetSpecialty } from './schemas/referralsSchema';

export const schema = {
  users,
  pets,
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
  treatmentTemplates,
  referrals,
  referralAttachments,
  referralNotes,
};

// Re-export all tables and their relations for Drizzle to use
export * from './schemas/practicesSchema';
export * from './schemas/sessionsSchema';
export * from './schemas/usersSchema';
export * from './schemas/appointmentsSchema';
export * from './schemas/petsSchema';
export * from './schemas/admissionsSchema';
export * from './schemas/roomsSchema';
export * from './schemas/customFieldsSchema';
export * from './schemas/soapNoteSchema';
export * from './schemas/soapNoteTemplateSchema';
export * from './schemas/treatmentsSchema';
export * from './schemas/whiteboardItemsSchema';
export * from './schemas/inventorySchema';
export * from './schemas/treatmentTemplatesSchema';
export * from './schemas/referralsSchema';

// You might also want to re-export the userRoleEnum if it's used elsewhere for typing
export { UserRoleEnum };
