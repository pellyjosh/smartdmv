// schema/inventorySchema.ts
import { dbTable, text, timestamp, integer, boolean } from '@/db/db.config';
import { sql } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';

const isSqlite = process.env.DB_TYPE === 'sqlite';

export const inventory = dbTable('inventory', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  practiceId: integer("practice_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // "medication", "supply", "equipment"
  description: text("description"),
  sku: text("sku"),
  quantity: integer("quantity").notNull().default(0),
  unit: text("unit"),
  minQuantity: integer("min_quantity"), // For low stock alerts
  lastRestockDate: timestamp("last_restock_date"),
  expiryDate: timestamp("expiry_date"),
  cost: text("cost"),
  price: text("price"),
  location: text("location"), // Storage location in the clinic
  supplier: text("supplier"),
  batchTracking: boolean("batch_tracking").default(false), // Whether to track separate batches with different expiry dates
  deaSchedule: text("dea_schedule", { enum: ["none", "schedule_i", "schedule_ii", "schedule_iii", "schedule_iv", "schedule_v"] }).default(sql`'none'`),
  requiresSpecialAuth: boolean("requires_special_auth").default(false), // Extra authorization for controlled substances
  createdAt: isSqlite
    ? timestamp('createdAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: isSqlite
    ? timestamp('updatedAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`).$onUpdate(() => sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export type Inventory = typeof inventory.$inferSelect;

export const insertInventorySchema = createInsertSchema(inventory)
  .omit({ id: true, createdAt: true, updatedAt: true });

// DEA Schedule enum for controlled substances
export enum DEASchedule {
  NONE = "none",
  SCHEDULE_I = "schedule_i",
  SCHEDULE_II = "schedule_ii",
  SCHEDULE_III = "schedule_iii",
  SCHEDULE_IV = "schedule_iv",
  SCHEDULE_V = "schedule_v"
}
