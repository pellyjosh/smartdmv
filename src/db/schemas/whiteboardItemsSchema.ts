// src/db/schemas/whiteboardItemsSchema.ts
import { dbTable, text, timestamp, integer } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { pets } from './petsSchema';
import { users } from './usersSchema';
import { practices } from './practicesSchema';

const isSqlite = process.env.DB_TYPE === 'sqlite';

export const whiteboardItemUrgencyEnum = ['high', 'medium', 'low', 'none'] as const;
export const whiteboardItemStatusEnum = ['active', 'inactive', 'resolved', 'pending_pickup', 'in_treatment'] as const;

export const whiteboardItems = dbTable('whiteboard_items', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  petId: text('pet_id').notNull().references(() => pets.id, { onDelete: 'cascade' }),
  practiceId: text('practice_id').notNull().references(() => practices.id, { onDelete: 'cascade' }),
  notes: text('notes'),
  urgency: text('urgency', { enum: whiteboardItemUrgencyEnum }).default('none'),
  status: text('status', { enum: whiteboardItemStatusEnum }).notNull().default('active'),
  assignedToId: text('assigned_to_id').references(() => users.id, { onDelete: 'set null' }), // Staff member assigned
  location: text('location'), // e.g., 'Room 1', 'Kennel A5'

  createdAt: isSqlite
    ? timestamp('createdAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),

  updatedAt: isSqlite
    ? timestamp('updatedAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`).$onUpdate(() => sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdateFn(() => new Date()),
});

export const whiteboardItemsRelations = relations(whiteboardItems, ({ one }) => ({
  pet: one(pets, {
    fields: [whiteboardItems.petId],
    references: [pets.id],
  }),
  assignedTo: one(users, {
    fields: [whiteboardItems.assignedToId],
    references: [users.id],
  }),
  practice: one(practices, {
    fields: [whiteboardItems.practiceId],
    references: [practices.id],
  }),
}));

export type SelectWhiteboardItem = typeof whiteboardItems.$inferSelect;
export type InsertWhiteboardItem = typeof whiteboardItems.$inferInsert;

export interface WhiteboardItem {
  id: string;
  petId: string;
  practiceId: string;
  notes: string | null;
  urgency: (typeof whiteboardItemUrgencyEnum)[number] | null;
  status: (typeof whiteboardItemStatusEnum)[number];
  assignedToId: string | null;
  location: string | null;
  createdAt: Date;
  updatedAt: Date;
}