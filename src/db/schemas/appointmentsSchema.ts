// src/db/schemas/appointmentsSchema.ts
import { dbTable, text, timestamp } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { users } from './usersSchema';
import { pets } from './petsSchema';
import { practices } from './practicesSchema';

const isSqlite = process.env.DB_TYPE === 'sqlite';

export const appointmentStatusEnum = ['approved', 'rejected', 'pending'] as const;

export const appointments = dbTable('appointments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  description: text('description'),
  date: timestamp('date', { mode: 'timestamp_ms' }).notNull(), // Using timestamp_ms for date with time
  durationMinutes: text('duration_minutes').default('30'), // Store as text, parse to int in app
  status: text('status', { enum: appointmentStatusEnum }).notNull().default('pending'),
  petId: text('pet_id').references(() => pets.id, { onDelete: 'cascade' }), // Can be nullable if appointment is not for a pet
  clientId: text('client_id').references(() => users.id, { onDelete: 'set null' }), // User who booked, if applicable
  staffId: text('staff_id').references(() => users.id, { onDelete: 'set null' }), // Vet/Technician assigned
  // New practitionerId column, linked to the users table
  practitionerId: text('practitioner_id').references(() => users.id, { onDelete: 'set null' }), // Practitioner assigned to the appointment
  practiceId: text('practice_id').notNull().references(() => practices.id, { onDelete: 'cascade' }),

  createdAt: isSqlite
    ? timestamp('createdAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),

  updatedAt: isSqlite
    ? timestamp('updatedAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`).$onUpdate(() => sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdateFn(() => new Date()),
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
  practitionerId: string | null; // Add to the TypeScript interface
  practiceId: string;
  createdAt: Date;
  updatedAt: Date;
}