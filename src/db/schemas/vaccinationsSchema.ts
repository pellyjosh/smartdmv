// src/db/schemas/vaccinationsSchema.ts
import { dbTable, text, timestamp, boolean, primaryKeyId, foreignKeyInt } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { practices } from './practicesSchema';
import { users } from './usersSchema';
import { pets } from './petsSchema';

// Enum definitions
export const vaccineTypeEnum = ['core', 'non-core', 'optional'] as const;
export const speciesEnum = ['dog', 'cat', 'bird', 'reptile', 'rabbit', 'ferret', 'other'] as const;
export const routeEnum = ['subcutaneous', 'intramuscular', 'intranasal', 'oral', 'topical'] as const;
export const statusEnum = ['completed', 'scheduled', 'missed', 'cancelled'] as const;

// Vaccine Types Table - Templates for vaccines
export const vaccineTypes = dbTable('vaccine_types', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // e.g., "DHPP", "Rabies", "FVRCP"
  type: text('type', { enum: vaccineTypeEnum }).notNull(),
  species: text('species', { enum: speciesEnum }).notNull(),
  manufacturer: text('manufacturer'),
  diseasesProtected: text('diseases_protected'), // JSON array of diseases
  recommendedSchedule: text('recommended_schedule'), // JSON with age/timing recommendations
  durationOfImmunity: text('duration_of_immunity'), // e.g., "1 year", "3 years"
  sideEffects: text('side_effects'), // Common side effects
  contraindications: text('contraindications'), // When not to give
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

// Vaccinations Table - Actual vaccination records
export const vaccinations = dbTable('vaccinations', {
  id: primaryKeyId(),
  petId: foreignKeyInt('pet_id').notNull().references(() => pets.id, { onDelete: 'cascade' }),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id, { onDelete: 'cascade' }),
  vaccineTypeId: foreignKeyInt('vaccine_type_id').references(() => vaccineTypes.id, { onDelete: 'set null' }),
  
  // Vaccine details (can be from template or manual entry)
  vaccineName: text('vaccine_name').notNull(),
  manufacturer: text('manufacturer'),
  lotNumber: text('lot_number'),
  serialNumber: text('serial_number'),
  expirationDate: timestamp('expiration_date', { mode: 'date' }),
  
  // Administration details
  administrationDate: timestamp('administration_date', { mode: 'date' }).notNull(),
  administrationSite: text('administration_site'), // e.g., "left shoulder", "right hip"
  route: text('route', { enum: routeEnum }),
  dose: text('dose'), // e.g., "1ml", "0.5ml"
  administeringVetId: foreignKeyInt('administering_vet_id').references(() => users.id, { onDelete: 'set null' }),
  
  // Tracking and follow-up
  nextDueDate: timestamp('next_due_date', { mode: 'date' }),
  status: text('status', { enum: statusEnum }).notNull().default(sql`'completed'`),
  
  // Safety and reactions
  reactions: text('reactions'), // Any adverse reactions observed
  notes: text('notes'),
  
  // Metadata
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

// Relations
export const vaccineTypesRelations = relations(vaccineTypes, ({ one, many }) => ({
  practice: one(practices, {
    fields: [vaccineTypes.practiceId],
    references: [practices.id],
  }),
  vaccinations: many(vaccinations),
}));

export const vaccinationsRelations = relations(vaccinations, ({ one }) => ({
  pet: one(pets, {
    fields: [vaccinations.petId],
    references: [pets.id],
  }),
  practice: one(practices, {
    fields: [vaccinations.practiceId],
    references: [practices.id],
  }),
  vaccineType: one(vaccineTypes, {
    fields: [vaccinations.vaccineTypeId],
    references: [vaccineTypes.id],
  }),
  administeringVet: one(users, {
    fields: [vaccinations.administeringVetId],
    references: [users.id],
  }),
}));

// Type exports
export type VaccineType = typeof vaccineTypes.$inferSelect;
export type InsertVaccineType = typeof vaccineTypes.$inferInsert;
export type Vaccination = typeof vaccinations.$inferSelect;
export type InsertVaccination = typeof vaccinations.$inferInsert;

// Validation schemas
export const insertVaccineTypeSchema = createInsertSchema(vaccineTypes)
  .omit({ id: true, createdAt: true, updatedAt: true });

export const insertVaccinationSchema = createInsertSchema(vaccinations)
  .omit({ id: true, createdAt: true, updatedAt: true });
