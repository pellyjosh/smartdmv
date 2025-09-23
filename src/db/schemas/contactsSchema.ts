// src/db/schemas/contactsSchema.ts
import { dbTable, text, timestamp, integer, primaryKeyId, foreignKeyInt, boolean } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { users } from './usersSchema';
import { practices } from './practicesSchema';
import { pets } from './petsSchema';
import { appointments } from './appointmentsSchema';

export const contactMethodEnum = ['phone_call', 'video_call', 'message'] as const;
export const contactUrgencyEnum = ['low', 'medium', 'high', 'emergency'] as const;
export const contactStatusEnum = ['pending', 'in_progress', 'responded', 'closed'] as const;

export const contacts = dbTable('contacts', {
  id: primaryKeyId(),
  
  // Sender (Client) - required
  senderId: foreignKeyInt('sender_id').notNull().references(() => users.id as any, { onDelete: 'cascade' }),
  
  // Veterinarian/Practitioner - optional (can be "any available")
  veterinarianId: foreignKeyInt('veterinarian_id').references(() => users.id as any, { onDelete: 'set null' }),
  
  // Practice - required for context
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id as any, { onDelete: 'cascade' }),
  
  // Related Pet - optional
  petId: foreignKeyInt('pet_id').references(() => pets.id as any, { onDelete: 'set null' }),
  
  // Contact details
  contactMethod: text('contact_method').notNull(),
  urgency: text('urgency').notNull().default(sql`'medium'`),
  status: text('status').notNull().default(sql`'pending'`),
  
  // Message content
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  
  // Optional contact information
  phoneNumber: text('phone_number'),
  preferredTime: text('preferred_time'),
  
  // For video calls - appointment/room reference
  appointmentId: foreignKeyInt('appointment_id').references(() => appointments.id as any, { onDelete: 'set null' }),
  roomId: text('room_id'),
  
  // Response tracking
  isRead: boolean('is_read').default(false).notNull(),
  respondedAt: timestamp('responded_at', { mode: 'date' }),
  respondedBy: foreignKeyInt('responded_by').references(() => users.id as any, { onDelete: 'set null' }),
  
  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const contactsRelations = relations(contacts, ({ one }) => ({
  sender: one(users, {
    fields: [contacts.senderId],
    references: [users.id],
    relationName: 'contactSender'
  }),
  veterinarian: one(users, {
    fields: [contacts.veterinarianId],
    references: [users.id],
    relationName: 'contactVeterinarian'
  }),
  practice: one(practices, {
    fields: [contacts.practiceId],
    references: [practices.id],
  }),
  pet: one(pets, {
    fields: [contacts.petId],
    references: [pets.id],
  }),
  respondedByUser: one(users, {
    fields: [contacts.respondedBy],
    references: [users.id],
    relationName: 'contactResponder'
  }),
}));

export type SelectContact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

export interface Contact {
  id: string;
  senderId: string;
  veterinarianId?: string;
  practiceId: string;
  petId?: string;
  contactMethod: (typeof contactMethodEnum)[number];
  urgency: (typeof contactUrgencyEnum)[number];
  status: (typeof contactStatusEnum)[number];
  subject: string;
  message: string;
  phoneNumber?: string;
  preferredTime?: string;
  appointmentId?: string;
  roomId?: string;
  isRead: boolean;
  respondedAt?: Date;
  respondedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
