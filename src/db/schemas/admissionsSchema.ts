// src/db/schemas/admissionsSchema.ts
import { dbTable, text, timestamp, integer, primaryKeyId, foreignKeyInt } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { users } from './usersSchema';
import { pets } from './petsSchema';
import { practices } from './practicesSchema';
import { rooms } from './roomsSchema';

export const admissionStatusEnum = ['pending', 'admitted', 'hold', 'isolation', 'discharged'] as const;

export const admissions = dbTable('admissions', {
  id: primaryKeyId(),
  petId: foreignKeyInt('pet_id').notNull().references(() => pets.id as any, { onDelete: 'cascade' }),
  clientId: foreignKeyInt('client_id').notNull().references(() => users.id as any, { onDelete: 'cascade' }),
  attendingVetId: foreignKeyInt('attending_vet_id').notNull().references(() => users.id as any, { onDelete: 'cascade' }),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id as any, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  notes: text('notes'),
  roomId: integer('room_id').references(() => rooms.id as any, { onDelete: 'set null' }),
  admissionDate: timestamp('admission_date', { mode: 'date' }).notNull(),
  dischargeDate: timestamp('discharge_date', { mode: 'date' }),
  status: text('status', { enum: admissionStatusEnum }).notNull().default(sql`'pending'`),

  createdAt: timestamp('created_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const admissionsRelations = relations(admissions, ({ one }) => ({
 pet: one(pets, {
 fields: [admissions.petId],
 references: [pets.id],
 }),
 client: one(users, {
 fields: [admissions.clientId],
 references: [users.id],
 relationName: 'admissionClient',
 }),
 attendingVet: one(users, {
 fields: [admissions.attendingVetId],
 references: [users.id],
 relationName: 'admissionAttendingVet',
 }),
 practice: one(practices, {
 fields: [admissions.practiceId],
 references: [practices.id],
 }),
 room: one(rooms, {
 fields: [admissions.roomId],
 references: [rooms.id],
 }),
}));

export type SelectAdmission = typeof admissions.$inferSelect;
export type InsertAdmission = typeof admissions.$inferInsert;

export interface Admission {
 id: number;
 petId: string;
 clientId: string;
 attendingVetId: string;
 practiceId: string;
 reason: string;
 notes: string | null;
 roomId: number | null;
 admissionDate: Date;
 dischargeDate: Date | null;
 status: (typeof admissionStatusEnum)[number];
 createdAt: Date;
 updatedAt: Date;
}