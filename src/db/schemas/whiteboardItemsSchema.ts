// src/db/schemas/whiteboardItemsSchema.ts
import { dbTable, text, timestamp, primaryKeyId, foreignKeyInt } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { pets } from './petsSchema';
import { users } from './usersSchema';
import { practices } from './practicesSchema';

export const whiteboardItemUrgencyEnum = ['high', 'medium', 'low', 'none'] as const;
export const whiteboardItemStatusEnum = ['active', 'inactive', 'resolved', 'pending_pickup', 'in_treatment'] as const;

export const whiteboardItems = dbTable('whiteboard_items', {
  id: primaryKeyId(),
  petId: foreignKeyInt('pet_id').notNull().references(() => pets.id, { onDelete: 'cascade' }),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id, { onDelete: 'cascade' }),
  notes: text('notes'),
  urgency: text('urgency', { enum: whiteboardItemUrgencyEnum }).default(sql`'none'`),
  status: text('status', { enum: whiteboardItemStatusEnum }).notNull().default(sql`'active'`),
  assignedToId: foreignKeyInt('assigned_to_id').references(() => users.id, { onDelete: 'set null' }), // Staff member assigned
  location: text('location'), // e.g., 'Room 1', 'Kennel A5'

  createdAt: timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),

  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
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