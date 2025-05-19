
// schema/usersSchema.ts
import { dbTable, text, timestamp, primaryKey } from '@/db/db.config';
import { relations } from 'drizzle-orm';
import { practices } from './practicesSchema';
import { sessions } from './sessionsSchema';

const isSqlite = process.env.DB_TYPE === 'sqlite';

export const userRoleEnum = ['CLIENT', 'PRACTICE_ADMINISTRATOR', 'ADMINISTRATOR'] as const;

export const users = dbTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  name: text('name'),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: userRoleEnum }).notNull(),
  practiceId: text('practice_id').references(() => practices.id, { onDelete: 'set null' }),
  currentPracticeId: text('current_practice_id').references(() => practices.id, { onDelete: 'set null' }),

  createdAt: isSqlite
    ? timestamp('created_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000))
    : timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),

  updatedAt: isSqlite
    ? timestamp('updated_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000))
    : timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
});

export const administratorAccessiblePractices = dbTable('administrator_accessible_practices', {
  administratorId: text('administrator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  practiceId: text('practice_id').notNull().references(() => practices.id, { onDelete: 'cascade' }),

  assignedAt: isSqlite
    ? timestamp('assigned_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000))
    : timestamp('assigned_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.administratorId, table.practiceId] }),
}));



export const usersRelations = relations(users, ({ one, many }) => ({
  assignedPractice: one(practices, {
    fields: [users.practiceId],
    references: [practices.id],
    relationName: 'usersPracticeRelation',
  }),
  currentSelectedPractice: one(practices, {
    fields: [users.currentPracticeId],
    references: [practices.id],
    relationName: 'usersCurrentPracticeRelation',
  }),
  accessiblePractices: many(administratorAccessiblePractices),
  sessions: many(sessions),
}));

export const administratorAccessiblePracticesRelations = relations(administratorAccessiblePractices, ({ one }) => ({
  administrator: one(users, {
    fields: [administratorAccessiblePractices.administratorId],
    references: [users.id],
  }),
  practice: one(practices, {
    fields: [administratorAccessiblePractices.practiceId],
    references: [practices.id],
  }),
}));
