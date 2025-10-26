import { dbTable, text, timestamp, primaryKeyId, boolean, jsonb, foreignKeyInt, foreignKeyText } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { users } from './usersSchema';
import { administratorAccessiblePractices } from './usersSchema';

export const practices = dbTable('practices', {
  id: primaryKeyId(),
  name: text('name').notNull(),

  // Contact information
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zipCode: text('zip_code'),
  country: text('country'),

  // Practice branding
  logoPath: text('logo_path'), // Path to practice logo file

  // Website integration settings
  apiKey: text('api_key'), // Encrypted API key for external integrations
  apiKeyLastReset: timestamp('api_key_last_reset', { mode: 'date' }), // When the API key was last reset
  webhookUrl: text('webhook_url'), // URL for sending webhook notifications
  bookingWidgetEnabled: boolean('booking_widget_enabled').default(false), // Whether online booking is enabled
  bookingWidgetSettings: jsonb('booking_widget_settings'), // Configuration for booking widget

  // Payment provider configuration (per-practice)
  // Store encrypted secret keys or token references. In production these should be encrypted
  // at rest (KMS) and not stored as plain text.
  paymentProviders: jsonb('payment_providers'), // e.g. { stripe: { publishableKey, secretKeyEncrypted, enabled }, paystack: { publicKey, secretKeyEncrypted, enabled } }
  paymentEnabled: boolean('payment_enabled').default(false),

  // Default currency for the practice (points to currencies.id) - should be set by practice in settings
  defaultCurrencyId: foreignKeyInt('default_currency_id').references(() => require('./currencySchema').currencies.id),

  // Mark this location as the head office for the organization
  isHeadOffice: boolean('is_head_office').default(false),

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
  isHeadOffice?: boolean;
  apiKey?: string | null;
  apiKeyLastReset?: Date | null;
  webhookUrl?: string | null;
  bookingWidgetEnabled?: boolean;
  bookingWidgetSettings?: any; // JSON object
  defaultCurrencyId?: number | null;
  paymentProviders?: any;
  paymentEnabled?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
