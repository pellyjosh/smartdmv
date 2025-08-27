// src/db/schemas/appointmentsSchema.ts
import { dbTable, text, timestamp, primaryKeyId, foreignKeyInt } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { users } from './usersSchema';
import { pets } from './petsSchema';
import { practices } from './practicesSchema';

export const appointmentStatusEnum = [
  'pending',           // Initial booking, not yet confirmed
  'approved',          // Confirmed by practice, ready for triage
  'rejected',          // Declined by practice
  'triage',            // Waiting for initial assessment
  'active',            // Currently being treated
  'in_treatment',      // Actively in treatment room
  'in_progress',       // For telemedicine sessions that are active
  'completed',         // Finished successfully
  'pending_pickup',    // Waiting for owner pickup
  'cancelled',         // Cancelled by owner or practice
  'no_show'            // Patient didn't arrive
] as const;

export const appointmentSourceEnum = [
  'internal',          // Booked from admin panel or internal system
  'external'           // Booked from external website widget
] as const;

export const appointments = dbTable('appointments', {
  id: primaryKeyId(),
  title: text('title').notNull(),
  description: text('description'),
  date: timestamp('date', { mode: 'date' }).notNull(),
  durationMinutes: text('duration_minutes').default(sql`'30'`),
  status: text('status', { enum: appointmentStatusEnum }).notNull().default(sql`'pending'`),
  petId: foreignKeyInt('pet_id').references(() => pets.id, { onDelete: 'cascade' }),
  clientId: foreignKeyInt('client_id').references(() => users.id, { onDelete: 'set null' }),
  staffId: foreignKeyInt('staff_id').references(() => users.id, { onDelete: 'set null' }),
  type: text('type'),
  practitionerId: foreignKeyInt('practitioner_id').references(() => users.id, { onDelete: 'set null' }),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id, { onDelete: 'cascade' }),
  source: text('source', { enum: appointmentSourceEnum }).notNull().default(sql`'internal'`),
  
  // Telemedicine specific fields
  roomId: text('room_id'), // Unique room ID for WebRTC sessions
  notes: text('notes'), // Session notes/appointment notes
  telemedicineStartedAt: timestamp('telemedicine_started_at', { mode: 'date' }),
  telemedicineEndedAt: timestamp('telemedicine_ended_at', { mode: 'date' }),

  createdAt: timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  pet: one(pets, {
    fields: [appointments.petId],
    references: [pets.id],
  }),
  client: one(users, {
    fields: [appointments.clientId],
    references: [users.id],
    relationName: 'appointmentClient',
  }),
  staff: one(users, {
    fields: [appointments.staffId],
    references: [users.id],
    relationName: 'appointmentStaff',
  }),
  // New relation for practitioner
  practitioner: one(users, {
    fields: [appointments.practitionerId],
    references: [users.id],
    relationName: 'appointmentPractitioner', // Give it a distinct relation name
  }),
  practice: one(practices, {
    fields: [appointments.practiceId],
    references: [practices.id],
  }),
}));

export type SelectAppointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

export interface Appointment {
  id: string;
  title: string;
  description: string | null;
  date: Date;
  durationMinutes: string | null;
  status: (typeof appointmentStatusEnum)[number];
  petId: string | null;
  clientId: string | null;
  staffId: string | null;
  type: string | null;
  practitionerId: string | null;
  practiceId: string;
  roomId: string | null;
  notes: string | null;
  telemedicineStartedAt: Date | null;
  telemedicineEndedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  pet?: any;
  client?: any;
  staff?: any;
  practitioner?: any;
  practice?: any;
}