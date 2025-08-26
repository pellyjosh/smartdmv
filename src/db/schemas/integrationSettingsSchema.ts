// src/db/schemas/integrationSettingsSchema.ts
import { dbTable, text, timestamp, boolean, primaryKeyId, foreignKeyInt } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { practices } from './practicesSchema';

// Integration settings table for website appointment widget configurations
export const integrationSettings = dbTable('integration_settings', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id, { onDelete: 'cascade' }),
  
  // Website configuration
  websiteUrl: text('website_url'),
  isVerified: boolean('is_verified').default(false),
  
  // Widget settings (stored as JSON string)
  widgetSettings: text('widget_settings'), // JSON containing widget appearance, availability, etc.
  
  // API settings (stored as JSON string)
  apiSettings: text('api_settings'), // JSON containing API keys, permissions, etc.
  
  // Webhook configuration
  webhookUrl: text('webhook_url'),
  webhookSecret: text('webhook_secret'),
  
  // Rate limiting and security
  rateLimitPerHour: foreignKeyInt('rate_limit_per_hour').default(100),
  allowedOrigins: text('allowed_origins'), // JSON array of allowed origins for CORS
  
  // Status and metadata
  isActive: boolean('is_active').default(true),
  lastSyncAt: timestamp('last_sync_at', { mode: 'date' }),
  
  createdAt: timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

// Integration settings relations
export const integrationSettingsRelations = relations(integrationSettings, ({ one }) => ({
  practice: one(practices, {
    fields: [integrationSettings.practiceId],
    references: [practices.id],
  }),
}));

// Analytics table for tracking widget usage
export const widgetAnalytics = dbTable('widget_analytics', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id, { onDelete: 'cascade' }),
  
  // Event tracking
  eventType: text('event_type').notNull(), // 'impression', 'interaction', 'booking', 'conversion'
  widgetId: text('widget_id'), // Unique identifier for the widget instance
  sessionId: text('session_id'), // Browser session ID
  
  // Appointment data (for booking events)
  appointmentType: text('appointment_type'),
  appointmentDuration: foreignKeyInt('appointment_duration'),
  
  // Metadata
  userAgent: text('user_agent'),
  referrerUrl: text('referrer_url'),
  ipAddress: text('ip_address'),
  
  // Widget configuration at time of event
  widgetVersion: text('widget_version'),
  widgetConfig: text('widget_config'), // JSON snapshot of widget settings
  
  createdAt: timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Widget analytics relations
export const widgetAnalyticsRelations = relations(widgetAnalytics, ({ one }) => ({
  practice: one(practices, {
    fields: [widgetAnalytics.practiceId],
    references: [practices.id],
  }),
}));

// API keys table for secure API access
export const integrationApiKeys = dbTable('integration_api_keys', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id, { onDelete: 'cascade' }),
  
  // API key details
  keyName: text('key_name').notNull(),
  keyHash: text('key_hash').notNull(), // Hashed version of the API key
  keyPrefix: text('key_prefix').notNull(), // First few characters for identification
  
  // Permissions
  permissions: text('permissions').notNull(), // JSON array of permissions
  scopes: text('scopes'), // JSON array of allowed scopes/endpoints
  
  // Usage tracking
  lastUsedAt: timestamp('last_used_at', { mode: 'date' }),
  usageCount: foreignKeyInt('usage_count').default(0),
  
  // Rate limiting
  rateLimitPerHour: foreignKeyInt('rate_limit_per_hour').default(100),
  rateLimitPerDay: foreignKeyInt('rate_limit_per_day').default(1000),
  
  // Status
  isActive: boolean('is_active').default(true),
  expiresAt: timestamp('expires_at', { mode: 'date' }),
  
  createdAt: timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

// API keys relations
export const integrationApiKeysRelations = relations(integrationApiKeys, ({ one }) => ({
  practice: one(practices, {
    fields: [integrationApiKeys.practiceId],
    references: [practices.id],
  }),
}));
