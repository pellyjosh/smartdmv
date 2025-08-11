// schema/prescriptionsSchema.ts
import { dbTable, text, timestamp, boolean, decimal, primaryKeyId, foreignKeyInt } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';

export const prescriptions = dbTable('prescriptions', {
  id: primaryKeyId(),
  soapNoteId: foreignKeyInt("soap_note_id"),
  petId: text("pet_id").notNull(),
  practiceId: text("practice_id").notNull(),
  
  // Updated to match recommended schema naming
  prescribedBy: text("prescribed_by").notNull(), // Changed to text to reference users table (UUIDs)
  dispensedBy: text("dispensed_by"), // Changed to text to reference users table (UUIDs)
  
  // Medication details
  inventoryItemId: foreignKeyInt("inventory_item_id"), // Kept as integer to reference inventory table
  medicationName: text("medication_name").notNull(), // Store name for historical purposes
  dosage: text("dosage").notNull(), // e.g., "10mg", "5ml", etc.
  route: text("route", { enum: ["oral", "injectable", "topical", "ophthalmic", "otic", "nasal", "rectal", "inhaled", "other"] }).notNull(),
  frequency: text("frequency", { enum: ["once", "BID", "TID", "QID", "SID", "PRN", "EOD", "weekly", "biweekly", "monthly", "other"] }).notNull(),
  duration: text("duration").notNull(), // e.g., "7 days", "2 weeks", etc.
  instructions: text("instructions"),
  
  // Quantity and dispensing (updated to match recommended schema)
  quantityPrescribed: decimal("quantity_prescribed").notNull(), // Changed to decimal for fractional amounts
  quantityDispensed: decimal("quantity_dispensed").default("0"),
  refillsAllowed: foreignKeyInt("refills_allowed").default(0), // Renamed to match schema
  refillsRemaining: foreignKeyInt("refills_remaining").default(0), // Renamed to match schema
  
  // Additional fields from recommended schema
  dispensedInHouse: boolean("dispensed_in_house").default(true),
  
  // Status and dates (updated naming)
  status: text("status", { enum: ["active", "dispensed", "completed", "cancelled"] }).notNull().default(sql`'active'`),
  dateCreated: timestamp('date_created', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  dateDispensed: timestamp("date_dispensed"),
  
  // Audit fields
  createdAt: timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),

  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

// Add Prescription History table as recommended
export const prescriptionHistory = dbTable('prescription_history', {
  id: primaryKeyId(),
  prescriptionId: foreignKeyInt("prescription_id").notNull(),
  quantityDispensed: decimal("quantity_dispensed").notNull(),
  dispensedBy: text("dispensed_by"), // Changed to text to reference users table (UUIDs)
  dateDispensed: timestamp('date_dispensed', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  notes: text("notes"),
  inventoryTransactionId: foreignKeyInt("inventory_transaction_id"),
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
