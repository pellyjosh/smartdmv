
import { pgTable, text, timestamp, primaryKey, integer } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// Practices Table
export const practices = pgTable('practices', {
  id: text('id').primaryKey(), // e.g., 'practice_MAIN_HQ', 'practice_NORTH'
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
});

export const practicesRelations = relations(practices, ({ many }) => ({
  usersPractice: many(users, { relationName: 'usersPracticeRelation' }), // For clients/practice admins
  usersCurrentPractice: many(users, {relationName: 'usersCurrentPracticeRelation'}), // For admins current practice
  accessibleToAdmins: many(administratorAccessiblePractices),
}));

// Users Table
export const userRoleEnum = ['CLIENT', 'PRACTICE_ADMINISTRATOR', 'ADMINISTRATOR'] as const;

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  name: text('name'),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: userRoleEnum }).notNull(),
  // For CLIENT and PRACTICE_ADMINISTRATOR, this links to their single practice
  practiceId: text('practice_id').references(() => practices.id, { onDelete: 'set null' }),
  // For ADMINISTRATOR role, this indicates their currently selected practice for viewing data.
  currentPracticeId: text('current_practice_id').references(() => practices.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  // Relation for CLIENT or PRACTICE_ADMINISTRATOR belonging to one practice
  assignedPractice: one(practices, {
    fields: [users.practiceId],
    references: [practices.id],
    relationName: 'usersPracticeRelation',
  }),
  // Relation for ADMINISTRATOR's current selected practice view
  currentSelectedPractice: one(practices, {
    fields: [users.currentPracticeId],
    references: [practices.id],
    relationName: 'usersCurrentPracticeRelation',
  }),
  // For ADMINISTRATOR role, linking to practices they can access
  accessiblePractices: many(administratorAccessiblePractices),
  sessions: many(sessions),
}));


// Join Table for Administrator's Accessible Practices (Many-to-Many)
export const administratorAccessiblePractices = pgTable('administrator_accessible_practices', {
  administratorId: text('administrator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  practiceId: text('practice_id').notNull().references(() => practices.id, { onDelete: 'cascade' }),
  assignedAt: timestamp('assigned_at', { mode: 'date' }).defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.administratorId, table.practiceId] }),
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

// Sessions Table (for database-backed cookies)
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(), // Session ID stored in the cookie
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { mode: 'date', withTimezone: true }).notNull(), // Store as full timestamp
  data: text('data'), // Can store JSON stringified session data
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));
