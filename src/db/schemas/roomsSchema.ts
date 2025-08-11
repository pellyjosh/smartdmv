// src/db/schemas/roomsSchema.ts
import { dbTable, text, timestamp, integer, primaryKey, boolean, primaryKeyId, foreignKeyInt } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { admissions } from './admissionsSchema';
import { practices } from './practicesSchema';

export const roomStatusEnum = ['available', 'occupied', 'maintenance'] as const;

export const rooms = dbTable('rooms', {
  id: primaryKeyId(),
  roomNumber: text('room_number').notNull(),
  type: text('type').notNull().default(sql`'standard'`),
  capacity: integer('capacity').notNull(),
  notes: text('notes'),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id, { onDelete: 'cascade' }),
  status: text('status', { enum: roomStatusEnum }).notNull().default(sql`'available'`),

  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),

  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const roomsRelations = relations(rooms, ({ one, many }) => ({
 practice: one(practices, {
 fields: [rooms.practiceId],
 references: [practices.id],
 }),
 admissions: many(admissions),
}));

export type SelectRoom = typeof rooms.$inferSelect;
export type InsertRoom = typeof rooms.$inferInsert;

export interface Room {
 id: number;
}