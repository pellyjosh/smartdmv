// src/db/schemas/whiteboardNotesSchema.ts
import { dbTable, text, timestamp, primaryKeyId, foreignKeyInt } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { users } from './usersSchema';
import { practices } from './practicesSchema';

export const whiteboardNotes = dbTable('whiteboard_notes', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id, { onDelete: 'cascade' }),
  authorId: foreignKeyInt('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  note: text('note').notNull(),
  date: text('date').notNull(), // Date the note is for (YYYY-MM-DD format)

  createdAt: timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const whiteboardNotesRelations = relations(whiteboardNotes, ({ one }) => ({
  author: one(users, {
    fields: [whiteboardNotes.authorId],
    references: [users.id],
  }),
  practice: one(practices, {
    fields: [whiteboardNotes.practiceId],
    references: [practices.id],
  }),
}));

export type SelectWhiteboardNote = typeof whiteboardNotes.$inferSelect;
export type InsertWhiteboardNote = typeof whiteboardNotes.$inferInsert;
export type WhiteboardNote = SelectWhiteboardNote & {
  author?: {
    id: number;
    name: string;
    email: string;
  };
};
