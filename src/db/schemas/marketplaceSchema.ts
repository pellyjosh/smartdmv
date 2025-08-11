import { dbTable, text, timestamp, boolean, primaryKeyId, integer, foreignKeyInt } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { practices } from './practicesSchema';
import { users } from './usersSchema';

// Enum for add-on categories
export enum AddonCategory {
  CLIENT_PORTAL = "CLIENT_PORTAL",
  AI = "AI",
  ADMINISTRATIVE = "ADMINISTRATIVE",
  COMMUNICATION = "COMMUNICATION",
  FINANCIAL = "FINANCIAL",
}

// Enum for subscription tiers
export enum SubscriptionTier {
  BASIC = "BASIC",
  STANDARD = "STANDARD",
  PREMIUM = "PREMIUM",
}

// Enum for payment status
export enum PaymentStatus {
  TRIAL = "TRIAL",
  PAID = "PAID",
  PAST_DUE = "PAST_DUE",
  CANCELLED = "CANCELLED",
}

export const addonCategoryValues = Object.values(AddonCategory) as [string, ...string[]];
export const subscriptionTierValues = Object.values(SubscriptionTier) as [string, ...string[]];
export const paymentStatusValues = Object.values(PaymentStatus) as [string, ...string[]];

// Addons table
export const addons = dbTable('addons', {
  id: primaryKeyId(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull(),
  shortDescription: text('short_description'),
  category: text('category', { enum: addonCategoryValues }).notNull(),
  icon: text('icon'),
  coverImage: text('cover_image'),
  galleryImages: text('gallery_images').$type<string[]>(), // JSON string for SQLite
  features: text('features').$type<string[]>(), // JSON string for SQLite
  pricingTiers: text('pricing_tiers').$type<Record<string, { price: number; features: string[] }>>(), // JSON string for SQLite
  price: text('price'), // Legacy price field for backwards compatibility
  isPopular: boolean('is_popular').default(false),
  isFeatured: boolean('is_featured').default(false),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  deletedAt: timestamp('deleted_at', { mode: 'date' }),
});

// Practice add-ons (subscriptions) table
export const practiceAddons = dbTable('practice_addons', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id, { onDelete: 'cascade' }),
  addonId: foreignKeyInt('addon_id').notNull().references(() => addons.id as any, { onDelete: 'cascade' }),
  subscriptionTier: text('subscription_tier', { enum: subscriptionTierValues }).notNull(),
  billingCycle: text('billing_cycle', { enum: ['monthly', 'yearly'] as [string, ...string[]] }).notNull().default(sql`'monthly'`),
  startDate: timestamp('start_date', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  endDate: timestamp('end_date', { mode: 'date' }),
  paymentStatus: text('payment_status', { enum: paymentStatusValues }).notNull(),
  isActive: boolean('is_active').default(true),
  lastActivatedAt: timestamp('last_activated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  deletedAt: timestamp('deleted_at', { mode: 'date' }),
});

// Add-on reviews table
export const addonReviews = dbTable('addon_reviews', {
  id: primaryKeyId(),
  addonId: foreignKeyInt('addon_id').notNull().references(() => addons.id as any, { onDelete: 'cascade' }),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id, { onDelete: 'cascade' }),
  userId: foreignKeyInt('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  title: text('title', { length: 100 }),
  comment: text('comment'),
  isVerifiedPurchase: boolean('is_verified_purchase').default(false),
  isPublished: boolean('is_published').default(true),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  deletedAt: timestamp('deleted_at', { mode: 'date' }),
});

// Relationships for addons
export const addonsRelations = relations(addons, ({ many }) => ({
  practiceAddons: many(practiceAddons),
  reviews: many(addonReviews),
}));

// Relationships for practice add-ons
export const practiceAddonsRelations = relations(practiceAddons, ({ one }) => ({
  practice: one(practices, {
    fields: [practiceAddons.practiceId],
    references: [practices.id],
  }),
  addon: one(addons, {
    fields: [practiceAddons.addonId],
    references: [addons.id],
  }),
}));

// Relationships for add-on reviews
export const addonReviewsRelations = relations(addonReviews, ({ one }) => ({
  addon: one(addons, {
    fields: [addonReviews.addonId],
    references: [addons.id],
  }),
  practice: one(practices, {
    fields: [addonReviews.practiceId],
    references: [practices.id],
  }),
  user: one(users, {
    fields: [addonReviews.userId],
    references: [users.id],
  }),
}));

// Types for TypeScript inference
export type Addon = typeof addons.$inferSelect;
export type PracticeAddon = typeof practiceAddons.$inferSelect;
export type AddonReview = typeof addonReviews.$inferSelect;

export type InsertAddon = typeof addons.$inferInsert;
export type InsertPracticeAddon = typeof practiceAddons.$inferInsert;
export type InsertAddonReview = typeof addonReviews.$inferInsert;
