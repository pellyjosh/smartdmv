import { dbTable, text, timestamp, primaryKeyId, boolean, jsonb, foreignKeyText } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { users } from './usersSchema';
import { administratorAccessiblePractices } from './usersSchema';

export const practices = dbTable('practices', {
  id: primaryKeyId(),
  name: text('name').notNull(),
  
  // Website integration settings
  apiKey: text('api_key'), // Encrypted API key for external integrations
  apiKeyLastReset: timestamp('api_key_last_reset', { mode: 'date' }), // When the API key was last reset
  webhookUrl: text('webhook_url'), // URL for sending webhook notifications
  bookingWidgetEnabled: boolean('booking_widget_enabled').default(false), // Whether online booking is enabled
  bookingWidgetSettings: jsonb('booking_widget_settings'), // Configuration for booking widget
  
  createdAt: timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull().$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const practicesRelations = relations(practices, ({ many }) => ({
  usersPractice: many(users, { relationName: 'usersPracticeRelation' }),
  usersCurrentPractice: many(users, { relationName: 'usersCurrentPracticeRelation' }),
  accessibleToAdmins: many(administratorAccessiblePractices),
}));

export interface Practice {
  id: string;
  name: string;
  tenantId: string;
  apiKey?: string | null;
  apiKeyLastReset?: Date | null;
  webhookUrl?: string | null;
  bookingWidgetEnabled?: boolean;
  bookingWidgetSettings?: any; // JSON object
  createdAt: Date;
  updatedAt: Date;
}
