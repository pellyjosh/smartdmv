// schema/prescriptionsSchema.ts
import { dbTable, text, timestamp, integer, boolean, decimal } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';

const isSqlite = process.env.DB_TYPE === 'sqlite';

export const prescriptions = dbTable('prescriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  soapNoteId: integer("soap_note_id"),
  petId: text("pet_id").notNull(),
  practiceId: text("practice_id").notNull(),
  
  // Updated to match recommended schema naming
  prescribedBy: integer("prescribed_by").notNull(), // Changed to integer to reference users table
  dispensedBy: integer("dispensed_by"), // Added dispensed_by field
  
  // Medication details
  inventoryItemId: integer("inventory_item_id"), // Changed to integer to reference inventory table
  medicationName: text("medication_name").notNull(), // Store name for historical purposes
  dosage: text("dosage").notNull(), // e.g., "10mg", "5ml", etc.
  route: text("route", { enum: ["oral", "injectable", "topical", "ophthalmic", "otic", "nasal", "rectal", "inhaled", "other"] }).notNull(),
  frequency: text("frequency", { enum: ["once", "BID", "TID", "QID", "SID", "PRN", "EOD", "weekly", "biweekly", "monthly", "other"] }).notNull(),
  duration: text("duration").notNull(), // e.g., "7 days", "2 weeks", etc.
  instructions: text("instructions"),
  
  // Quantity and dispensing (updated to match recommended schema)
  quantityPrescribed: decimal("quantity_prescribed").notNull(), // Changed to decimal for fractional amounts
  quantityDispensed: decimal("quantity_dispensed").default("0"),
  refillsAllowed: integer("refills_allowed").default(0), // Renamed to match schema
  refillsRemaining: integer("refills_remaining").default(0), // Renamed to match schema
  
  // Additional fields from recommended schema
  dispensedInHouse: boolean("dispensed_in_house").default(true),
  
  // Status and dates (updated naming)
  status: text("status", { enum: ["active", "dispensed", "completed", "cancelled"] }).notNull().default(sql`'active'`),
  dateCreated: isSqlite
    ? timestamp('date_created', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('date_created', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  dateDispensed: timestamp("date_dispensed"),
  
  // Audit fields
  createdAt: isSqlite
    ? timestamp('createdAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),

  updatedAt: isSqlite
    ? timestamp('updatedAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`).$onUpdate(() => sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

// Add Prescription History table as recommended
export const prescriptionHistory = dbTable('prescription_history', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  prescriptionId: integer("prescription_id").notNull(),
  quantityDispensed: decimal("quantity_dispensed").notNull(),
  dispensedBy: integer("dispensed_by"),
  dateDispensed: isSqlite
    ? timestamp('date_dispensed', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('date_dispensed', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  notes: text("notes"),
  inventoryTransactionId: integer("inventory_transaction_id"),
  practiceId: text("practice_id").notNull(),
});

export type Prescription = typeof prescriptions.$inferSelect;
export type InsertPrescription = typeof prescriptions.$inferInsert;
export type PrescriptionHistory = typeof prescriptionHistory.$inferSelect;
export type InsertPrescriptionHistory = typeof prescriptionHistory.$inferInsert;

export const insertPrescriptionSchema = createInsertSchema(prescriptions)
  .omit({ id: true, createdAt: true, updatedAt: true, dateCreated: true });

export const insertPrescriptionHistorySchema = createInsertSchema(prescriptionHistory)
  .omit({ id: true, dateDispensed: true });
