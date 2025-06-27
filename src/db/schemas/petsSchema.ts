// src/db/schemas/petsSchema.ts
import { dbTable, text, timestamp } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { users } from './usersSchema';
import { practices } from './practicesSchema';
import { appointments } from './appointmentsSchema';
import { healthPlans } from './healthPlansSchema';
import { whiteboardItems } from './whiteboardItemsSchema';

const isSqlite = process.env.DB_TYPE === 'sqlite';

export const pets = dbTable('pets', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  species: text('species'),
  breed: text('breed'),
  date_of_birth: timestamp('date_of_birth', { mode: 'date' }),
  ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  practiceId: text('practice_id').notNull().references(() => practices.id, { onDelete: 'cascade' }),

  createdAt: isSqlite
    ? timestamp('createdAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),

  updatedAt: isSqlite
    ? timestamp('updatedAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`).$onUpdate(() => sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdateFn(() => new Date()),
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
}