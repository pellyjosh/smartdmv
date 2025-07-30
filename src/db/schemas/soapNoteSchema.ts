
// schema/soapNoteSchema.ts
import { dbTable, text, timestamp, integer, boolean } from '@/db/db.config';
import { sql, relations } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { users } from './usersSchema';
import { pets } from './petsSchema';
import { appointments } from './appointmentsSchema';


const isSqlite = process.env.DB_TYPE === 'sqlite';


export const soapNotes = dbTable('soap_notes', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  appointmentId: text("appointment_id").references(() => appointments.id),
  practitionerId: text("practitioner_id").notNull().references(() => users.id),
  petId: text("pet_id").notNull().references(() => pets.id),
  subjective: text("subjective"), // Patient history, reported symptoms
  objective: text("objective"), // Examination findings, vital signs, test results
  assessment: text("assessment"), // Diagnosis, clinical impression
  plan: text("plan"), // Treatment plan, medications, follow-up
  hasPrescriptions: boolean("has_prescriptions").default(false), // Indicates if there are prescriptions
  hasAttachments: boolean("has_attachments").default(false), // Indicates if there are attachments
  hasTreatments: boolean("has_treatments").default(false), // Indicates if there are treatments recorded
  locked: boolean("locked").default(false),
  lockedAt: timestamp("locked_at"),
  updatedById: text("updated_by_id"),
  createdAt: isSqlite
    ? timestamp('createdAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),

  updatedAt: isSqlite
    ? timestamp('updatedAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`).$onUpdate(() => sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
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