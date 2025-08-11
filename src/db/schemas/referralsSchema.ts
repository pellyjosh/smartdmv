import { dbTable, text, timestamp, integer, primaryKey, boolean, primaryKeyId, foreignKeyInt } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
// Import referenced tables - assuming they are exported from a central schema or individual files
import { pets } from '../../db/schema'; // Adjusted path to main schema file
import { practices } from '../../db/schema'; // Adjusted path to main schema file
import { users } from '../../db/schema'; // Adjusted path to main schema file

// Referral status enum
export enum ReferralStatus {
  DRAFT = "draft",
  PENDING = "pending",
  ACCEPTED = "accepted",
  DECLINED = "declined",
  COMPLETED = "completed",
  CANCELLED = "cancelled"
}

// Referral priority enum
export enum ReferralPriority {
  ROUTINE = "routine",
  URGENT = "urgent",
  EMERGENCY = "emergency"
}

// Specialty enum for referral specialists
export enum VetSpecialty {
  CARDIOLOGY = "cardiology",
  DENTISTRY = "dentistry",
  DERMATOLOGY = "dermatology",
  EMERGENCY = "emergency",
  INTERNAL_MEDICINE = "internal_medicine",
  NEUROLOGY = "neurology",
  ONCOLOGY = "oncology",
  OPHTHALMOLOGY = "ophthalmology",
  ORTHOPEDICS = "orthopedics",
  RADIOLOGY = "radiology",
  SURGERY = "surgery",
  OTHER = "other"
}

// Referral table for vet referrals
export const referrals = dbTable("referrals", {
  id: primaryKeyId(),
  petId: foreignKeyInt("pet_id").notNull().references(() => pets.id, { onDelete: 'cascade' }),
  referringPracticeId: foreignKeyInt("referring_practice_id").notNull().references(() => practices.id, { onDelete: 'cascade' }),
  referringVetId: foreignKeyInt("referring_vet_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  specialistId: foreignKeyInt("specialist_id").references(() => users.id, { onDelete: 'cascade' }),
  specialistPracticeId: foreignKeyInt("specialist_practice_id").references(() => practices.id, { onDelete: 'cascade' }),
  referralReason: text("referral_reason").notNull(),
  specialty: text("specialty").notNull(),
  clinicalHistory: text("clinical_history"),
  currentMedications: text("current_medications"),
  diagnosticTests: text("diagnostic_tests"),
  referralNotes: text("referral_notes"),
  priority: text("priority", { enum: ["routine", "urgent", "emergency"] }).default("routine" as any).notNull(),
  status: text("status", { enum: ["draft", "pending", "accepted", "declined", "completed", "cancelled"] }).default("draft" as any).notNull(),
  scheduledDate: text("scheduled_date"),
  completedDate: text("completed_date"),
  attachments: boolean("attachments").default(false),
  createAppointment: boolean("create_appointment").default(false),
  createdAt: timestamp("createdAt", { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updatedAt", { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdateFn(() => new Date())
});

// Referral attachments table
export const referralAttachments = dbTable("referral_attachments", {
  id: primaryKeyId(),
  referralId: foreignKeyInt("referral_id").notNull().references(() => referrals.id, { onDelete: 'cascade' }),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: foreignKeyInt("file_size").notNull(),
  filePath: text("file_path").notNull(),
  uploadedById: foreignKeyInt("uploaded_by_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  description: text("description"),
  createdAt: timestamp("createdAt", { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Referral updates/notes table for tracking communication
export const referralNotes = dbTable("referral_notes", {
  id: primaryKeyId(),
  referralId: foreignKeyInt("referral_id").notNull().references(() => referrals.id, { onDelete: 'cascade' }),
  authorId: foreignKeyInt("author_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  noteContent: text("note_content").notNull(),
  isPrivate: boolean("is_private").default(false),
  createdAt: timestamp("createdAt", { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Define relations for referrals
export const referralsRelations = relations(referrals, ({ one, many }) => ({
  pet: one(pets, {
    fields: [referrals.petId],
    references: [pets.id]
  }),
  referringPractice: one(practices, {
    fields: [referrals.referringPracticeId],
    references: [practices.id],
    relationName: "referring_practice"
  }),
  referringVet: one(users, {
    fields: [referrals.referringVetId],
    references: [users.id],
    relationName: "referring_vet"
  }),
  specialist: one(users, {
    fields: [referrals.specialistId],
    references: [users.id],
    relationName: "specialist"
  }),
  specialistPractice: one(practices, {
    fields: [referrals.specialistPracticeId],
    references: [practices.id],
    relationName: "specialist_practice"
  }),
  attachments: many(referralAttachments),
  notes: many(referralNotes)
}));

// Define relations for referral attachments
export const referralAttachmentsRelations = relations(referralAttachments, ({ one }) => ({
  referral: one(referrals, {
    fields: [referralAttachments.referralId],
    references: [referrals.id]
  }),
  uploadedBy: one(users, {
    fields: [referralAttachments.uploadedById],
    references: [users.id]
  })
}));

// Define relations for referral notes
export const referralNotesRelations = relations(referralNotes, ({ one }) => ({
  referral: one(referrals, {
    fields: [referralNotes.referralId],
    references: [referrals.id]
  }),
  author: one(users, {
    fields: [referralNotes.authorId],
    references: [users.id]
  })
}));

// Type definitions for referral tables
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;

export type ReferralAttachment = typeof referralAttachments.$inferSelect;
export type InsertReferralAttachment = typeof referralAttachments.$inferInsert;

export type ReferralNote = typeof referralNotes.$inferSelect;
export type InsertReferralNote = typeof referralNotes.$inferInsert;
