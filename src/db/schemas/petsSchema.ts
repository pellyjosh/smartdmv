// src/db/schemas/petsSchema.ts
import { dbTable, text, timestamp, primaryKeyId, foreignKeyInt } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { users } from './usersSchema';
import { practices } from './practicesSchema';
import { appointments } from './appointmentsSchema';
import { healthPlans } from './healthPlansSchema';
import { whiteboardItems } from './whiteboardItemsSchema';

export const pets = dbTable('pets', {
  id: primaryKeyId(),
  name: text('name').notNull(),
  species: text('species'),
  breed: text('breed'),
  dateOfBirth: timestamp('dateOfBirth', { mode: 'date' }),
  ownerId: foreignKeyInt('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id, { onDelete: 'cascade' }),

  weight: text('weight'),
  allergies: text('allergies'),
  color: text('color'),
  gender: text('gender'),
  microchipNumber: text('microchip_number'),
  pet_type: text('pet_type'),
  photoPath: text('photo_path'),

  createdAt: timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const petsRelations = relations(pets, ({ one, many }) => ({
  owner: one(users, {
    fields: [pets.ownerId],
    references: [users.id],
  }),
  practice: one(practices, {
    fields: [pets.practiceId],
    references: [practices.id],
  }),
  appointments: many(appointments),
  healthPlans: many(healthPlans),
  whiteboardItems: many(whiteboardItems),
}));

export type SelectPet = typeof pets.$inferSelect;
export type InsertPet = typeof pets.$inferInsert;

export interface Pet {
  id: string;
  name: string;
  species: string | null;
  breed: string | null;
  dateOfBirth: Date | null;
  ownerId: string;
  practiceId: string;
  createdAt: Date;
  updatedAt: Date;
  weight: string | null;
  allergies: string | null;
  color: string | null;
  gender: string | null;
  microchipNumber: string | null;
  pet_type: string | null;
  photoPath: string | null;
}