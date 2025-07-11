// src/db/schemas/roomsSchema.ts
import { dbTable, text, timestamp, integer, primaryKey, boolean } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { admissions } from './admissionsSchema';
import { practices } from './practicesSchema';

const isSqlite = process.env.DB_TYPE === 'sqlite';

export const roomStatusEnum = ['available', 'occupied', 'maintenance'] as const;

export const rooms = dbTable('rooms', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  roomNumber: text('room_number').notNull(),
  type: text('type').notNull().default('standard'),
  capacity: integer('capacity').notNull(),
  notes: text('notes'),
  practiceId: text('practice_id').notNull().references(() => practices.id, { onDelete: 'cascade' }),
  status: text('status', { enum: roomStatusEnum }).notNull().default('available'),

  createdAt: isSqlite
    ? timestamp('createdAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('createdAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),

  updatedAt: isSqlite
    ? timestamp('updatedAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`).$onUpdate(() => sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdateFn(() => new Date()),
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