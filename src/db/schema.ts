
import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

// Practices Table
export const practices = sqliteTable('practices', {
  id: text('id').primaryKey(), // e.g., 'practice_MAIN_HQ', 'practice_NORTH'
  name: text('name').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const practicesRelations = relations(practices, ({ many }) => ({
  clients: many(users, { relationName: 'clientPractice' }),
  practiceAdmins: many(users, { relationName: 'practiceAdminPractice' }),
  accessibleToAdmins: many(administratorAccessiblePractices),
}));

// Users Table
export const userRoleEnum = ['CLIENT', 'PRACTICE_ADMINISTRATOR', 'ADMINISTRATOR'] as const;

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  name: text('name'),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: userRoleEnum }).notNull(),
  // For CLIENT and PRACTICE_ADMINISTRATOR, this links to their single practice
  // For ADMINISTRATOR, this could be null or represent their primary/default practice,
  // but true multi-practice access is handled by the join table.
  // We'll make it nullable and rely on currentPracticeId logic for admins.
  practiceId: text('practice_id').references(() => practices.id, { onDelete: 'set null' }),
  // For ADMINISTRATOR role, this indicates their currently selected practice for viewing data.
  // This is more of an application-level preference than a strict DB relation for this field.
  currentPracticeId: text('current_practice_id').references(() => practices.id, { onDelete: 'set null' }),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  // Relation for CLIENT or PRACTICE_ADMINISTRATOR belonging to one practice
  assignedPractice: one(practices, {
    fields: [users.practiceId],
    references: [practices.id],
    relationName: 'userAssignedPractice', // Unique name if practiceId is used by multiple roles differently
  }),
  // Relation for ADMINISTRATOR's current selected practice view
  currentSelectedPractice: one(practices, {
    fields: [users.currentPracticeId],
    references: [practices.id],
    relationName: 'adminCurrentPractice',
  }),
  // For ADMINISTRATOR role, linking to practices they can access
  accessiblePractices: many(administratorAccessiblePractices),
  sessions: many(sessions),
}));


// Join Table for Administrator's Accessible Practices (Many-to-Many)
export const administratorAccessiblePractices = sqliteTable('administrator_accessible_practices', {
  administratorId: text('administrator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  practiceId: text('practice_id').notNull().references(() => practices.id, { onDelete: 'cascade' }),
  assignedAt: text('assigned_at').default(sql`CURRENT_TIMESTAMP`),
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
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(), // Session ID stored in the cookie
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(), // Store as Unix timestamp (seconds)
  data: text('data'), // Can store JSON stringified session data
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));
