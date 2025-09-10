// schema/inventoryTransactionsSchema.ts
import { dbTable, text, timestamp, integer, foreignKeyInt, primaryKeyId } from '@/db/db.config';
import { sql } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { inventory } from './inventorySchema';
import { users } from './usersSchema';

export const inventoryTransactions = dbTable('inventory_transactions', {
  id: primaryKeyId(),
  inventoryId: foreignKeyInt("inventory_id").notNull().references(() => inventory.id, { onDelete: 'cascade' }),
  transactionType: text("transaction_type", { 
    enum: ["add", "remove", "use", "expired", "lost", "adjustment"] 
  }).notNull(),
  quantity: integer("quantity").notNull(), // Can be positive or negative
  notes: text("notes"),
  referenceType: text("reference_type"), // e.g., "appointment", "prescription", "manual"
  referenceId: text("reference_id"), // ID of the referenced entity
  referenceData: text("reference_data"), // JSON string with additional data about the reference
  performedById: text("performed_by_id").notNull().references(() => users.id),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;

export const insertInventoryTransactionSchema = createInsertSchema(inventoryTransactions)
  .omit({ id: true, createdAt: true });
