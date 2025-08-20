// src/db/schemas/checklistsSchema.ts
import { dbTable, text, timestamp, integer, boolean, primaryKeyId, foreignKeyInt, jsonb } from '@/db/db.config';
import { sql } from 'drizzle-orm';
import { practices } from './practicesSchema';
import { users } from './usersSchema';
import { pets } from './petsSchema';
import { appointments } from './appointmentsSchema';
import { soapNotes } from './soapNoteSchema';

// Treatment Checklist Templates
export const treatmentChecklistTemplates = dbTable('treatment_checklist_templates', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  category: text('category'),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  autoAssignToDiagnosis: jsonb('auto_assign_to_diagnosis'), // array of strings
  createdById: foreignKeyInt('created_by_id').notNull().references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

// Template Items
export const templateItems = dbTable('template_items', {
  id: primaryKeyId(),
  templateId: foreignKeyInt('template_id').notNull().references(() => treatmentChecklistTemplates.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  position: integer('position').default(0).notNull(),
  isRequired: boolean('is_required').default(false).notNull(),
  estimatedDuration: integer('estimated_duration'), // minutes
  reminderThreshold: integer('reminder_threshold'), // hours before due
  assigneeRole: text('assignee_role'),
  createdAt: timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

// Assigned Checklists
export const assignedChecklists = dbTable('assigned_checklists', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id, { onDelete: 'cascade' }),
  petId: foreignKeyInt('pet_id').notNull().references(() => pets.id, { onDelete: 'cascade' }),
  templateId: foreignKeyInt('template_id').references(() => treatmentChecklistTemplates.id, { onDelete: 'set null' }),
  appointmentId: foreignKeyInt('appointment_id').references(() => appointments.id, { onDelete: 'set null' }),
  soapNoteId: foreignKeyInt('soap_note_id').references(() => soapNotes.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  status: text('status', { enum: ['pending', 'in_progress', 'completed', 'cancelled'] as [string, ...string[]] }).notNull().default(sql`'pending'`),
  priority: text('priority', { enum: ['low', 'medium', 'high', 'urgent'] as [string, ...string[]] }).notNull().default(sql`'medium'`),
  dueDate: timestamp('due_date', { mode: 'date' }),
  assignedById: foreignKeyInt('assigned_by_id').references(() => users.id, { onDelete: 'set null' }),
  assignedToId: foreignKeyInt('assigned_to_id').references(() => users.id, { onDelete: 'set null' }),
  notes: text('notes'),
  createdAt: timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

// Checklist Items (instantiated per assigned checklist)
export const checklistItems = dbTable('checklist_items', {
  id: primaryKeyId(),
  checklistId: foreignKeyInt('checklist_id').notNull().references(() => assignedChecklists.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  priority: text('priority', { enum: ['low', 'medium', 'high', 'urgent'] as [string, ...string[]] }),
  dueDate: timestamp('due_date', { mode: 'date' }),
  completed: boolean('completed').default(false).notNull(),
  completedAt: timestamp('completed_at', { mode: 'date' }),
  completedById: foreignKeyInt('completed_by_id').references(() => users.id, { onDelete: 'set null' }),
  assignedToId: foreignKeyInt('assigned_to_id').references(() => users.id, { onDelete: 'set null' }),
  notes: text('notes'),
  // copied/meta from template
  position: integer('position').default(0).notNull(),
  isRequired: boolean('is_required').default(false).notNull(),
  estimatedDuration: integer('estimated_duration'),
  reminderThreshold: integer('reminder_threshold'),
  assigneeRole: text('assignee_role'),
  createdAt: timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export type TreatmentChecklistTemplate = typeof treatmentChecklistTemplates.$inferSelect;
export type TemplateItem = typeof templateItems.$inferSelect;
export type AssignedChecklist = typeof assignedChecklists.$inferSelect;
export type ChecklistItem = typeof checklistItems.$inferSelect;
