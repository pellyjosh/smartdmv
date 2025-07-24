import { dbTable, text, integer, boolean, timestamp } from '../db.config';
import { practices } from './practicesSchema';
import { pets } from './petsSchema';
import { users } from './usersSchema';
import { soapNotes } from './soapNoteSchema';
import { relations, sql } from 'drizzle-orm';

const isSqlite = process.env.DB_TYPE === 'sqlite';

// Lab Provider Settings
export const labProviderSettings = dbTable('lab_provider_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  practiceId: text('practice_id').notNull().references(() => practices.id, { onDelete: 'cascade' }),
  provider: text('provider', { 
    enum: ['idexx', 'antech', 'zoetis', 'heska', 'in_house', 'other'] 
  }).notNull(),
  apiKey: text('api_key'),
  apiSecret: text('api_secret'),
  accountId: text('account_id'),
  // In-house lab specific fields
  inHouseEquipment: text('in_house_equipment'),
  inHouseContact: text('in_house_contact'),
  inHouseLocation: text('in_house_location'),
  isActive: boolean('is_active').notNull().default(true),
  settings: text('settings'), // JSON as text for compatibility
  createdAt: isSqlite
    ? timestamp('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: isSqlite
    ? timestamp('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`).$onUpdate(() => sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updated_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdateFn(() => new Date()),
});

// Lab Test Catalog
export const labTestCatalog = dbTable('lab_test_catalog', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  testCode: text('test_code').notNull(), // Provider's code for the test
  testName: text('test_name').notNull(), // Reverted back to testName to match existing schema
  category: text('category', { 
    enum: ['blood_chemistry', 'hematology', 'urinalysis', 'pathology', 'microbiology', 
           'parasitology', 'endocrinology', 'serology', 'cytology', 'imaging', 'rapid_test', 'panel', 'other'] 
  }).notNull(),
  description: text('description'),
  provider: text('provider', { 
    enum: ['idexx', 'antech', 'zoetis', 'heska', 'in_house', 'other'] 
  }).notNull(),
  price: text('price'), // Store as text for decimal precision
  turnAroundTime: text('turn_around_time'), // e.g., "24 hours", "3-5 days"
  practiceId: text('practice_id').notNull().references(() => practices.id, { onDelete: 'cascade' }),
  isActive: boolean('is_active').notNull().default(true),
  // New fields for reference ranges and test instructions
  referenceRanges: text('reference_ranges'), // JSON as text - Min/max normal values by species
  instructions: text('instructions'), // Preparation or collection instructions
  isPanel: boolean('is_panel').notNull().default(false), // Whether this is a panel (bundle of tests)
  panelTestIds: text('panel_test_ids'), // JSON array as text - test IDs included in this panel
  createdAt: isSqlite
    ? timestamp('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: isSqlite
    ? timestamp('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`).$onUpdate(() => sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updated_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdateFn(() => new Date()),
});

// Lab Orders
export const labOrders = dbTable('lab_orders', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  petId: text('pet_id').notNull().references(() => pets.id, { onDelete: 'cascade' }),
  practiceId: text('practice_id').notNull().references(() => practices.id, { onDelete: 'cascade' }),
  orderedById: text('ordered_by_id').notNull().references(() => users.id),
  soapNoteId: text('soap_note_id').references(() => soapNotes.id), // Link to SOAP note if applicable
  orderDate: isSqlite
    ? timestamp('order_date', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('order_date', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  status: text('status', { 
    enum: ['draft', 'ordered', 'submitted', 'in_progress', 'completed', 'cancelled'] 
  }).notNull().default('draft'), 
  provider: text('provider', { 
    enum: ['idexx', 'antech', 'zoetis', 'heska', 'in_house', 'other'] 
  }).notNull(),
  externalOrderId: text('external_order_id'),
  externalReference: text('external_reference'), // Additional reference number
  sampleCollectionDate: isSqlite
    ? timestamp('sample_collection_date', { mode: 'timestamp_ms' })
    : timestamp('sample_collection_date', { mode: 'date' }),
  sampleType: text('sample_type'), // e.g., "blood", "urine", "tissue"
  priority: text('priority', { enum: ['routine', 'urgent', 'stat'] }).notNull().default('routine'),
  notes: text('notes'),
  isManualEntry: boolean('is_manual_entry').notNull().default(false), // Whether order was manually entered
  totalPrice: text('total_price'), // Store as text for decimal precision
  createdAt: isSqlite
    ? timestamp('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: isSqlite
    ? timestamp('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`).$onUpdate(() => sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('updated_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdateFn(() => new Date()),
});

// Lab Order Tests (Many-to-Many between Orders and Tests)
export const labOrderTests = dbTable('lab_order_tests', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  labOrderId: integer('lab_order_id').notNull().references(() => labOrders.id, { onDelete: 'cascade' }),
  testCatalogId: integer('test_catalog_id').notNull().references(() => labTestCatalog.id, { onDelete: 'cascade' }),
  status: text('status', { 
    enum: ['ordered', 'in_progress', 'completed', 'cancelled'] 
  }).notNull().default('ordered'),
  price: text('price'), // Store as text for decimal precision
  createdAt: isSqlite
    ? timestamp('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Lab Results
export const labResults = dbTable('lab_results', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  labOrderId: integer('lab_order_id').notNull().references(() => labOrders.id, { onDelete: 'cascade' }),
  testCatalogId: integer('test_catalog_id').references(() => labTestCatalog.id), // Which test this result is for
  resultDate: isSqlite
    ? timestamp('result_date', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('result_date', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  results: text('results').notNull(), // Structured JSON with detailed results as text
  interpretation: text('interpretation'),
  status: text('status', { 
    enum: ['normal', 'abnormal', 'critical', 'pending', 'inconclusive'] 
  }).notNull().default('pending'),
  // Enhanced result fields for more detailed result data
  referenceRange: text('reference_range'), // Reference range used for this specific test as JSON text
  previousValue: text('previous_value'), // Value of the previous test for comparison as JSON text
  previousDate: isSqlite
    ? timestamp('previous_date', { mode: 'timestamp_ms' })
    : timestamp('previous_date', { mode: 'date' }), // Date of the previous test
  trendDirection: text('trend_direction', { 
    enum: ['increasing', 'decreasing', 'stable', 'fluctuating', 'none'] 
  }), // Trend compared to previous results
  abnormalFlags: text('abnormal_flags'), // JSON array as text - flags to help identify abnormal values
  reviewedBy: text('reviewed_by_id').references(() => users.id),
  reviewedAt: isSqlite
    ? timestamp('reviewed_at', { mode: 'timestamp_ms' })
    : timestamp('reviewed_at', { mode: 'date' }),
  notes: text('notes'),
  filePath: text('file_path'), // For attached result documents
  createdAt: isSqlite
    ? timestamp('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Relations
export const labProviderSettingsRelations = relations(labProviderSettings, ({ one }) => ({
  practice: one(practices, {
    fields: [labProviderSettings.practiceId],
    references: [practices.id],
  }),
}));

export const labTestCatalogRelations = relations(labTestCatalog, ({ one, many }) => ({
  practice: one(practices, {
    fields: [labTestCatalog.practiceId],
    references: [practices.id],
  }),
  orderTests: many(labOrderTests),
  results: many(labResults),
}));

export const labOrdersRelations = relations(labOrders, ({ one, many }) => ({
  practice: one(practices, {
    fields: [labOrders.practiceId],
    references: [practices.id],
  }),
  pet: one(pets, {
    fields: [labOrders.petId],
    references: [pets.id],
  }),
  orderedBy: one(users, {
    fields: [labOrders.orderedById],
    references: [users.id],
  }),
  soapNote: one(soapNotes, {
    fields: [labOrders.soapNoteId],
    references: [soapNotes.id],
  }),
  tests: many(labOrderTests),
  results: many(labResults),
}));

export const labOrderTestsRelations = relations(labOrderTests, ({ one }) => ({
  order: one(labOrders, {
    fields: [labOrderTests.labOrderId],
    references: [labOrders.id],
  }),
  test: one(labTestCatalog, {
    fields: [labOrderTests.testCatalogId],
    references: [labTestCatalog.id],
  }),
}));

export const labResultsRelations = relations(labResults, ({ one }) => ({
  order: one(labOrders, {
    fields: [labResults.labOrderId],
    references: [labOrders.id],
  }),
  test: one(labTestCatalog, {
    fields: [labResults.testCatalogId],
    references: [labTestCatalog.id],
  }),
  reviewedByUser: one(users, {
    fields: [labResults.reviewedBy],
    references: [users.id],
  }),
}));
