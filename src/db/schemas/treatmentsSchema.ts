
// schema/usersSchema.ts
import { dbTable, text, timestamp, integer, boolean, decimal } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { soapNotes } from './soapNoteSchema';
import { pets } from './petsSchema';
import { users } from './usersSchema';
import { inventory } from './inventorySchema';
import { createInsertSchema } from 'drizzle-zod';


const isSqlite = process.env.DB_TYPE === 'sqlite';

export const treatments = dbTable('treatments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  soapNoteId: integer("soap_note_id").references(() => soapNotes.id),
  petId: text("pet_id").notNull().references(() => pets.id),
  practitionerId: text("practitioner_id").notNull().references(() => users.id),
  practiceId: text("practice_id").notNull(),
  name: text("name").notNull(), // Treatment name
  category: text("category", { enum: ["medication", "procedure", "surgery", "therapy", "diagnostic", "wellness", "other"] }).notNull(),
  description: text("description"),
  // Medication-specific fields
  inventoryItemId: text("inventory_item_id").references(() => inventory.id), // Link to medication in inventory
  dosage: text("dosage"), // e.g., "10mg", "5ml", etc.
  route: text("route", { enum: ["oral", "injectable", "topical", "ophthalmic", "otic", "nasal", "rectal", "inhaled", "other"] }),
  frequency: text("frequency", { enum: ["once", "BID", "TID", "QID", "SID", "PRN", "EOD", "weekly", "biweekly", "monthly", "other"] }),
  duration: text("duration"), // e.g., "7 days", "2 weeks", etc.
  instructions: text("instructions"),
  // Procedure-specific fields
  procedureCode: text("procedure_code"), // CPT/Billing code
  location: text("location"), // Body location or site
  technician: text("technician").references(() => users.id), // Assisting technician
  // Common fields
  status: text("status", { enum: ["planned", "in_progress", "completed", "discontinued"] }).notNull().default(sql`'planned'`),
  startDate: timestamp('start_date', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  endDate: timestamp("end_date"),
  outcome: text("outcome"),
  followUpNeeded: boolean("follow_up_needed").default(false),
  followUpDate: timestamp("follow_up_date"),
  followUpNotes: text("follow_up_notes"),
  cost: decimal("cost"),
  billed: boolean("billed").default(false),
  // Medical record details
  notes: text("notes"),
  createdAt: isSqlite
    ? timestamp('createdAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),

  updatedAt: isSqlite
    ? timestamp('updatedAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`).$onUpdate(() => sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export type Treatment = typeof treatments.$inferSelect;

export const insertTreatmentSchema = createInsertSchema(treatments)
  .omit({ id: true, createdAt: true, updatedAt: true });

// Prescription routes/dosing information
export enum MedicationRoute {
    ORAL = "oral",
    INJECTABLE = "injectable",
    TOPICAL = "topical",
    OPHTHALMIC = "ophthalmic",
    OTIC = "otic",
    NASAL = "nasal",
    RECTAL = "rectal",
    INHALED = "inhaled",
    OTHER = "other"
  }
  
  // Prescription frequency information
  export enum DosageFrequency {
    ONCE = "once",
    BID = "BID", // Twice daily
    TID = "TID", // Three times daily
    QID = "QID", // Four times daily
    SID = "SID", // Once daily
    PRN = "PRN", // As needed
    EOD = "EOD", // Every other day
    WEEKLY = "weekly",
    BIWEEKLY = "biweekly",
    MONTHLY = "monthly",
    OTHER = "other"
  }
