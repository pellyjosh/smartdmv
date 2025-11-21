
// schema/soapNoteSchema.ts
import { dbTable, text, timestamp, integer, boolean, primaryKeyId, foreignKeyInt, json } from '@/db/db.config';
import { sql, relations } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { users } from './usersSchema';
import { pets } from './petsSchema';
import { appointments } from './appointmentsSchema';



export const soapNotes = dbTable('soap_notes', {
  id: primaryKeyId(),
  appointmentId: foreignKeyInt("appointment_id").references(() => appointments.id),
  practitionerId: foreignKeyInt("practitioner_id").notNull().references(() => users.id),
  petId: foreignKeyInt("pet_id").notNull().references(() => pets.id),

  // Main SOAP text fields
  subjective: text("subjective"), // Patient history, reported symptoms
  objective: text("objective"), // Examination findings, vital signs, test results
  assessment: text("assessment"), // Diagnosis, clinical impression
  plan: text("plan"), // Treatment plan, medications, follow-up

  // Subjective tab fields
  chiefComplaint: json("chief_complaint").$type<string[]>().default([]), // Array of chief complaints
  patientHistory: text("patient_history"), // Patient history
  symptoms: text("symptoms"), // Additional symptoms
  duration: text("duration"), // Duration of symptoms

  // Objective tab fields - Vital signs
  temperature: text("temperature"), // Temperature reading
  heartRate: text("heart_rate"), // Heart rate
  respiratoryRate: text("respiratory_rate"), // Respiratory rate
  weight: text("weight"), // Weight
  bloodPressure: text("blood_pressure"), // Blood pressure
  oxygenSaturation: text("oxygen_saturation"), // Oxygen saturation

  // Objective tab fields - General appearance
  generalAppearance: text("general_appearance"), // General appearance
  hydration: text("hydration"), // Hydration status

  // Objective tab fields - Cardiovascular
  heartSounds: text("heart_sounds"), // Heart sounds
  cardiovascularNotes: text("cardiovascular_notes"), // Cardiovascular notes

  // Objective tab fields - Respiratory
  lungSounds: text("lung_sounds"), // Lung sounds
  respiratoryEffort: text("respiratory_effort"), // Respiratory effort
  respiratoryNotes: text("respiratory_notes"), // Respiratory notes

  // Objective tab fields - Gastrointestinal
  abdomenPalpation: text("abdomen_palpation"), // Abdomen palpation findings
  bowelSounds: text("bowel_sounds"), // Bowel sounds
  gastrointestinalNotes: text("gastrointestinal_notes"), // GI notes

  // Objective tab fields - Musculoskeletal
  gait: text("gait"), // Gait assessment
  jointStatus: text("joint_status"), // Joint status
  musculoskeletalNotes: text("musculoskeletal_notes"), // MS notes

  // Objective tab fields - Neurological
  mentalStatus: text("mental_status"), // Mental status
  reflexes: text("reflexes"), // Reflexes
  neurologicalNotes: text("neurological_notes"), // Neurological notes

  // Objective tab fields - Integumentary/Skin
  skinCondition: text("skin_condition"), // Skin condition
  coatCondition: text("coat_condition"), // Coat condition
  skinNotes: text("skin_notes"), // Skin/coating notes

  // Assessment tab fields
  primaryDiagnosis: json("primary_diagnosis").$type<string[]>().default([]), // Array of primary diagnoses
  differentialDiagnoses: json("differential_diagnoses").$type<string[]>().default([]), // Array of differential diagnoses
  progressStatus: text("progress_status"), // Progress status
  confirmationStatus: text("confirmation_status"), // Confirmation status
  progressNotes: text("progress_notes"), // Progress notes

  // Plan tab fields
  treatment: text("treatment"), // Treatment plan
  medications: json("medications").$type<any[]>().default([]), // Array of medications
  procedures: json("procedures").$type<string[]>().default([]), // Array of procedures
  procedureNotes: text("procedure_notes"), // Procedure notes
  diagnostics: json("diagnostics").$type<string[]>().default([]), // Array of diagnostics
  clientEducation: text("client_education"), // Client education
  followUpTimeframe: text("follow_up_timeframe"), // Follow-up timeframe
  followUpReason: text("follow_up_reason"), // Follow-up reason

  // Flags
  hasPrescriptions: boolean("has_prescriptions").default(false), // Indicates if there are prescriptions
  hasAttachments: boolean("has_attachments").default(false), // Indicates if there are attachments
  hasTreatments: boolean("has_treatments").default(false), // Indicates if there are treatments recorded

  // Locking info
  locked: boolean("locked").default(false),
  lockedAt: timestamp("locked_at"),

  // Audit fields
  updatedById: foreignKeyInt("updated_by_id").references(() => users.id),
  createdAt: timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export type SOAPNote = typeof soapNotes.$inferSelect;
export type InsertSOAPNote = typeof soapNotes.$inferInsert;

export const insertSOAPNoteSchema = createInsertSchema(soapNotes)
  .omit({ id: true, createdAt: true, updatedAt: true, lockedAt: true, hasPrescriptions: true });

// Relations
export const soapNotesRelations = relations(soapNotes, ({ one }) => ({
  appointment: one(appointments, {
    fields: [soapNotes.appointmentId],
    references: [appointments.id],
  }),
  practitioner: one(users, {
    fields: [soapNotes.practitionerId],
    references: [users.id],
    relationName: 'soapNotePractitioner',
  }),
  pet: one(pets, {
    fields: [soapNotes.petId],
    references: [pets.id],
  }),
  updatedBy: one(users, {
    fields: [soapNotes.updatedById],
    references: [users.id],
    relationName: 'soapNoteUpdatedBy',
  }),
}));
