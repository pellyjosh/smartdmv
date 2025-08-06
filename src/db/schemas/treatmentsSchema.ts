
// schema/treatmentsSchema.ts - Updated to align with comprehensive schema
import { dbTable, text, timestamp, integer, boolean, decimal } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { soapNotes } from './soapNoteSchema';
import { pets } from './petsSchema';
import { users } from './usersSchema';
import { inventory } from './inventorySchema';
import { createInsertSchema } from 'drizzle-zod';


const isSqlite = process.env.DB_TYPE === 'sqlite';

export const treatments = dbTable('treatments', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  soapNoteId: integer("soap_note_id").references(() => soapNotes.id),
  petId: text("pet_id").notNull().references(() => pets.id),
  practitionerId: text("practitioner_id").notNull().references(() => users.id),
  practiceId: text("practice_id").notNull(),
  
  // Treatment Information
  name: text("name").notNull(),
  category: text("category", { 
    enum: ["medication", "procedure", "surgery", "therapy", "diagnostic", "wellness", "other"] 
  }).notNull(),
  description: text("description"),
  
  // Medication-specific fields
  inventoryItemId: text("inventory_item_id"), // Removed reference for now to avoid cross-DB issues
  dosage: text("dosage"),
  route: text("route", { enum: ["oral", "injectable", "topical", "ophthalmic", "otic", "nasal", "rectal", "inhaled", "other"] }),
  frequency: text("frequency", { enum: ["once", "BID", "TID", "QID", "SID", "PRN", "EOD", "weekly", "biweekly", "monthly", "other"] }),
  duration: text("duration"),
  instructions: text("instructions"),
  
  // Procedure-specific fields
  procedureCode: text("procedure_code"), // CPT/Billing code
  location: text("location"), // Body location or site
  technician: text("technician"), // Removed reference for now to avoid cross-DB issues
  
  // Status & Billing (aligned with recommended schema)
  status: text("status", { enum: ["planned", "in_progress", "completed", "discontinued"] }).notNull().default(sql`'planned'`),
  administeredDate: isSqlite
    ? timestamp('administered_date', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('administered_date', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  cost: decimal("cost"),
  billable: boolean("billable").default(false),
  notes: text("notes"),
  
  createdAt: isSqlite
    ? timestamp('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),

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
