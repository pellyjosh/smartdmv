
// schema/usersSchema.ts
import { dbTable, text, timestamp, integer, boolean } from '@/db/db.config';
import { sql } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';


const isSqlite = process.env.DB_TYPE === 'sqlite';


export const soapNotes = dbTable('soap_notes', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  appointmentId: integer("appointment_id").notNull(),
  practitionerId: integer("practitioner_id").notNull(),
  petId: integer("pet_id").notNull(),
  subjective: text("subjective"), // Patient history, reported symptoms
  objective: text("objective"), // Examination findings, vital signs, test results
  assessment: text("assessment"), // Diagnosis, clinical impression
  plan: text("plan"), // Treatment plan, medications, follow-up
  hasPrescriptions: boolean("has_prescriptions").default(false), // Indicates if there are prescriptions
  hasAttachments: boolean("has_attachments").default(false), // Indicates if there are attachments
  hasTreatments: boolean("has_treatments").default(false), // Indicates if there are treatments recorded
  locked: boolean("locked").default(false),
  lockedAt: timestamp("locked_at"),
  updatedById: integer("updated_by_id"),
  createdAt: isSqlite
    ? timestamp('createdAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),

  updatedAt: isSqlite
    ? timestamp('updatedAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`).$onUpdate(() => sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdateFn(() => new Date()),
});

export type SOAPNote = typeof soapNotes.$inferSelect;
export type InsertSOAPNote = typeof soapNotes.$inferInsert;

export const insertSOAPNoteSchema = createInsertSchema(soapNotes)
  .omit({ id: true, createdAt: true, updatedAt: true, lockedAt: true, hasPrescriptions: true });