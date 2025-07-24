// src/db/schemas/boardingSchema.ts
import { dbTable, text, boolean, timestamp, integer } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { pets } from './petsSchema';
import { users } from './usersSchema';

const isSqlite = process.env.DB_TYPE === 'sqlite';

// Boarding - Kennel sizes
export enum KennelSize {
  EXTRA_SMALL = "extra_small",
  SMALL = "small",
  MEDIUM = "medium",
  LARGE = "large",
  EXTRA_LARGE = "extra_large"
}

// Boarding - Kennel types
export enum KennelType {
  STANDARD = "standard",
  DELUXE = "deluxe",
  PREMIUM = "premium",
  ISOLATION = "isolation",
  OUTDOOR = "outdoor",
  CATS_ONLY = "cats_only",
  SPECIAL_NEEDS = "special_needs"
}

// Boarding - Activity types
export enum BoardingActivityType {
  FEEDING = "feeding",
  MEDICATION = "medication",
  EXERCISE = "exercise",
  GROOMING = "grooming",
  PLAYTIME = "playtime", 
  BATHROOM = "bathroom",
  CHECK_UP = "check_up",
  OTHER = "other"
}

// Boarding - Feeding types
export enum FeedingType {
  REGULAR = "regular", // Practice provided standard food
  SPECIAL_DIET = "special_diet", // Practice provided special diet food
  OWNER_PROVIDED = "owner_provided" // Food brought by owner
}

// Boarding - Feeding frequencies
export enum FeedingFrequency {
  ONCE_DAILY = "once_daily",
  TWICE_DAILY = "twice_daily",
  THREE_TIMES_DAILY = "three_times_daily",
  FREE_FEEDING = "free_feeding", // Food available at all times
  CUSTOM = "custom" // Custom feeding schedule
}

// Boarding - Boarding stay status
export enum BoardingStayStatus {
  SCHEDULED = "scheduled",
  CHECKED_IN = "checked_in",
  CHECKED_OUT = "checked_out",
  CANCELLED = "cancelled"
}

export const kennelTypeEnum = ["standard", "deluxe", "premium", "isolation", "outdoor", "cats_only", "special_needs"] as const;
export const kennelSizeEnum = ["extra_small", "small", "medium", "large", "extra_large"] as const;
export const boardingStayStatusEnum = ["scheduled", "checked_in", "checked_out", "cancelled"] as const;
export const feedingTypeEnum = ["regular", "special_diet", "owner_provided"] as const;
export const feedingFrequencyEnum = ["once_daily", "twice_daily", "three_times_daily", "free_feeding", "custom"] as const;
export const boardingActivityTypeEnum = ["feeding", "medication", "exercise", "grooming", "playtime", "bathroom", "check_up", "other"] as const;

// Boarding - Kennels table
export const kennels = dbTable("kennels", {
  id: text('id').primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: kennelTypeEnum }).notNull(),
  size: text("size", { enum: kennelSizeEnum }).notNull(),
  location: text("location"), // E.g. "Wing A", "Building 2", etc.
  description: text("description"),
  isActive: boolean("is_active").default(true),
  practiceId: text("practice_id").notNull(),
  
  createdAt: isSqlite
    ? timestamp('createdAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),

  updatedAt: isSqlite
    ? timestamp('updatedAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`).$onUpdate(() => sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Boarding - Boarding stays table
export const boardingStays = dbTable("boarding_stays", {
  id: text('id').primaryKey(),
  petId: text("pet_id").notNull(),
  kennelId: text("kennel_id").notNull(),
  checkInDate: timestamp("check_in_date", { mode: 'date' }).notNull(),
  plannedCheckOutDate: timestamp("planned_check_out_date", { mode: 'date' }).notNull(),
  actualCheckOutDate: timestamp("actual_check_out_date", { mode: 'date' }),
  status: text("status", { enum: boardingStayStatusEnum }).notNull(),
  specialInstructions: text("special_instructions"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  reservationNotes: text("reservation_notes"),
  belongingsDescription: text("belongings_description"),
  dailyRate: text("daily_rate"), // Store as text for SQLite compatibility
  practiceId: text("practice_id").notNull(),
  createdById: text("created_by_id").notNull(),
  
  createdAt: isSqlite
    ? timestamp('createdAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),

  updatedAt: isSqlite
    ? timestamp('updatedAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`).$onUpdate(() => sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Boarding - Requirements table
export const boardingRequirements = dbTable("boarding_requirements", {
  id: text('id').primaryKey(),
  stayId: text("stay_id").notNull(),
  requirementType: text("requirement_type").notNull(), // E.g. "vaccination", "documentation", "deposit", etc.
  requirementDescription: text("requirement_description").notNull(),
  isMandatory: boolean("is_mandatory").default(true),
  isCompleted: boolean("is_completed").default(false),
  completedDate: timestamp("completed_date", { mode: 'date' }),
  completedById: text("completed_by_id"),
  notes: text("notes"),
  practiceId: text("practice_id").notNull(),
  
  createdAt: isSqlite
    ? timestamp('createdAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),

  updatedAt: isSqlite
    ? timestamp('updatedAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`).$onUpdate(() => sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Boarding - Feeding schedules
export const feedingSchedules = dbTable("feeding_schedules", {
  id: text('id').primaryKey(),
  stayId: text("stay_id").notNull(),
  feedingType: text("feeding_type", { enum: feedingTypeEnum }).notNull(),
  foodDescription: text("food_description"), // Description of food type, brand, etc.
  frequency: text("frequency", { enum: feedingFrequencyEnum }).notNull(),
  amount: text("amount").notNull(), // Amount per feeding
  specialInstructions: text("special_instructions"),
  practiceId: text("practice_id").notNull(),
  
  createdAt: isSqlite
    ? timestamp('createdAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),

  updatedAt: isSqlite
    ? timestamp('updatedAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`).$onUpdate(() => sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Boarding - Medication schedules
export const medicationSchedules = dbTable("medication_schedules", {
  id: text('id').primaryKey(),
  stayId: text("stay_id").notNull(),
  medicationName: text("medication_name").notNull(),
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull(), // E.g. "twice daily", "every 8 hours"
  route: text("route").notNull(), // E.g. "oral", "topical"
  startDate: timestamp("start_date", { mode: 'date' }).notNull(),
  endDate: timestamp("end_date", { mode: 'date' }),
  specialInstructions: text("special_instructions"),
  lastAdministered: timestamp("last_administered", { mode: 'date' }),
  practiceId: text("practice_id").notNull(),
  
  createdAt: isSqlite
    ? timestamp('createdAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),

  updatedAt: isSqlite
    ? timestamp('updatedAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`).$onUpdate(() => sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updatedAt', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Boarding - Activity logs
export const boardingActivities = dbTable("boarding_activities", {
  id: text('id').primaryKey(),
  stayId: text("stay_id").notNull(),
  activityType: text("activity_type", { enum: boardingActivityTypeEnum }).notNull(),
  activityDate: timestamp("activity_date", { mode: 'date' }).notNull(),
  performedById: text("performed_by_id").notNull(),
  notes: text("notes"),
  success: boolean("success").default(true),
  practiceId: text("practice_id").notNull(),
  
  createdAt: isSqlite
    ? timestamp('createdAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Boarding relations
export const kennelsRelations = relations(kennels, ({ many }) => ({
  boardingStays: many(boardingStays),
}));

export const boardingStaysRelations = relations(boardingStays, ({ one, many }) => ({
  pet: one(pets, {
    fields: [boardingStays.petId],
    references: [pets.id],
  }),
  kennel: one(kennels, {
    fields: [boardingStays.kennelId],
    references: [kennels.id],
  }),
  createdBy: one(users, {
    fields: [boardingStays.createdById],
    references: [users.id],
  }),
  requirements: many(boardingRequirements),
  feedingSchedules: many(feedingSchedules),
  medicationSchedules: many(medicationSchedules),
  activities: many(boardingActivities),
}));

export const boardingRequirementsRelations = relations(boardingRequirements, ({ one }) => ({
  stay: one(boardingStays, {
    fields: [boardingRequirements.stayId],
    references: [boardingStays.id],
  }),
  completedBy: one(users, {
    fields: [boardingRequirements.completedById],
    references: [users.id],
  }),
}));

export const feedingSchedulesRelations = relations(feedingSchedules, ({ one }) => ({
  stay: one(boardingStays, {
    fields: [feedingSchedules.stayId],
    references: [boardingStays.id],
  }),
}));

export const medicationSchedulesRelations = relations(medicationSchedules, ({ one }) => ({
  stay: one(boardingStays, {
    fields: [medicationSchedules.stayId],
    references: [boardingStays.id],
  }),
}));

export const boardingActivitiesRelations = relations(boardingActivities, ({ one }) => ({
  stay: one(boardingStays, {
    fields: [boardingActivities.stayId],
    references: [boardingStays.id],
  }),
  performedBy: one(users, {
    fields: [boardingActivities.performedById],
    references: [users.id],
  }),
}));

// Type definitions for boarding tables
export type Kennel = typeof kennels.$inferSelect;
export type BoardingStay = typeof boardingStays.$inferSelect;
export type BoardingRequirement = typeof boardingRequirements.$inferSelect;
export type FeedingSchedule = typeof feedingSchedules.$inferSelect;
export type MedicationSchedule = typeof medicationSchedules.$inferSelect;
export type BoardingActivity = typeof boardingActivities.$inferSelect;
