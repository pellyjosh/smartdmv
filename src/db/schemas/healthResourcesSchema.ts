// src/db/schemas/healthResourcesSchema.ts
import { dbTable, text, timestamp, boolean, primaryKeyId, foreignKeyInt } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { practices } from './practicesSchema';

// Enum definitions
export const resourceCategoryEnum = ['wellness', 'nutrition', 'emergency', 'behavior', 'grooming', 'exercise', 'vaccination', 'preventive-care', 'dental-care', 'senior-care'] as const;
export const resourceTypeEnum = ['article', 'video', 'infographic', 'checklist', 'guide', 'emergency-contact'] as const;
export const resourceSpeciesEnum = ['dog', 'cat', 'bird', 'reptile', 'rabbit', 'ferret', 'all'] as const;

// Health Resources Table
export const healthResources = dbTable('health_resources', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').references(() => practices.id, { onDelete: 'cascade' }),
  
  // Resource details
  title: text('title').notNull(),
  description: text('description'),
  content: text('content'), // Full content/body of the resource
  category: text('category', { enum: resourceCategoryEnum }).notNull(),
  type: text('type', { enum: resourceTypeEnum }).notNull(),
  species: text('species', { enum: resourceSpeciesEnum }).notNull().default(sql`'all'`),
  
  // Media and links
  thumbnailUrl: text('thumbnail_url'),
  imageUrl: text('image_url'),
  videoUrl: text('video_url'),
  externalUrl: text('external_url'),
  downloadUrl: text('download_url'),
  
  // Metadata
  author: text('author'),
  tags: text('tags'), // JSON array of tags
  estimatedReadTime: text('estimated_read_time'), // e.g., "5 minutes"
  difficulty: text('difficulty', { enum: ['beginner', 'intermediate', 'advanced'] }),
  
  // Display settings
  featured: boolean('featured').default(false).notNull(),
  isPublic: boolean('is_public').default(true).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  viewCount: text('view_count').default(sql`'0'`),
  
  // Emergency contact specific fields
  emergencyType: text('emergency_type'), // e.g., "poison control", "24hr clinic"
  contactPhone: text('contact_phone'),
  contactAddress: text('contact_address'),
  availability: text('availability'), // e.g., "24/7", "Mon-Fri 9-5"
  
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

// Relations
export const healthResourcesRelations = relations(healthResources, ({ one }) => ({
  practice: one(practices, {
    fields: [healthResources.practiceId],
    references: [practices.id],
  }),
}));

// Type exports
export type HealthResource = typeof healthResources.$inferSelect;
export type InsertHealthResource = typeof healthResources.$inferInsert;

// Validation schemas
export const insertHealthResourceSchema = createInsertSchema(healthResources)
  .omit({ id: true, createdAt: true, updatedAt: true });
