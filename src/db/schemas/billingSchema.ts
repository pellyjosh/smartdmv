// src/db/schemas/billingSchema.ts
import { dbTable, text, timestamp, integer, decimal, primaryKeyId, foreignKeyInt } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { practices } from './practicesSchema';
import { currencies } from './currencySchema';
import { users } from './usersSchema';
import { pets } from './petsSchema';
import { treatments } from './treatmentsSchema';
import { appointments } from './appointmentsSchema';
import { createInsertSchema } from 'drizzle-zod';

// Invoices table
// Service Codes table (used for pricing & catalog of billable items)
export const serviceCodes = dbTable('service_codes', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id),
  code: text('code').notNull().unique(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  defaultPrice: decimal('default_price').notNull().default('0.00'),
  taxable: text('taxable', { enum: ['yes', 'no'] }).notNull().default(sql`'yes'`),
  taxRateId: integer('tax_rate_id'), // Future link to tax rates table
  active: text('active', { enum: ['yes', 'no'] }).notNull().default(sql`'yes'`),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const serviceCodesRelations = relations(serviceCodes, ({ one }) => ({
  practice: one(practices, {
    fields: [serviceCodes.practiceId],
    references: [practices.id],
  }),
}));

// Invoices table
export const invoices = dbTable('invoices', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt("practice_id").notNull().references(() => practices.id),
  clientId: foreignKeyInt("client_id").notNull().references(() => users.id),
  petId: foreignKeyInt("pet_id").references(() => pets.id), // Optional - for pet-specific invoices
  appointmentId: foreignKeyInt("appointment_id").references(() => appointments.id), // Optional - for appointment-based invoices
  
  // Invoice details
  invoiceNumber: text("invoice_number").notNull().unique(),
  description: text("description"),
  // Currency for the invoice (defaults to practice defaultCurrencyId)
  currencyId: foreignKeyInt('currency_id').notNull().references(() => currencies.id),
  subtotal: decimal("subtotal").notNull(),
  taxAmount: decimal("tax_amount").notNull().default('0.00'),
  discountAmount: decimal("discount_amount").notNull().default('0.00'),
  totalAmount: decimal("total_amount").notNull(),
  
  // Status and dates
  status: text("status", { 
    enum: ["draft", "sent", "pending", "paid", "overdue", "cancelled"] 
  }).notNull().default(sql`'pending'`),
  issueDate: timestamp('issue_date', { mode: 'date' }).notNull(),
  dueDate: timestamp('due_date', { mode: 'date' }).notNull(),
  paidDate: timestamp('paid_date', { mode: 'date' }),
  
  // Metadata
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

// Invoice line items
export const invoiceItems = dbTable('invoice_items', {
  id: primaryKeyId(),
  invoiceId: foreignKeyInt("invoice_id").notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  treatmentId: foreignKeyInt("treatment_id").references(() => treatments.id), // Optional - link to specific treatment
  
  // Item details
  description: text("description").notNull(),
  quantity: decimal("quantity").notNull().default('1'),
  unitPrice: decimal("unit_price").notNull(),
  // Currency for the line item (required)
  currencyId: foreignKeyInt('currency_id').notNull().references(() => currencies.id),
  subtotal: decimal("subtotal").notNull(),
  discountAmount: decimal("discount_amount").notNull().default('0.00'),
  taxable: text("taxable", { enum: ["yes", "no"] }).notNull().default(sql`'yes'`),
  
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Payments table
export const payments = dbTable('payments', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt("practice_id").notNull().references(() => practices.id),
  invoiceId: foreignKeyInt("invoice_id").notNull().references(() => invoices.id),
  clientId: foreignKeyInt("client_id").notNull().references(() => users.id),
  
  // Payment details
  paymentNumber: text("payment_number").notNull().unique(),
  amount: decimal("amount").notNull(),
  // Currency for the payment (should match invoice.currencyId) - required
  currencyId: foreignKeyInt('currency_id').notNull().references(() => currencies.id),
  paymentMethod: text("payment_method", { 
    enum: ["cash", "credit_card", "debit_card", "check", "bank_transfer", "online", "other"] 
  }).notNull(),
  // Payment processing info
  transactionId: text("transaction_id"), // From payment processor
  processorResponse: text("processor_response"), // JSON response from payment processor
  
  // Status and dates
  status: text("status", { 
    enum: ["pending", "processing", "completed", "failed", "cancelled", "refunded"] 
  }).notNull().default(sql`'pending'`),
  paymentDate: timestamp('payment_date', { mode: 'date' }).notNull(),
  
  // Metadata
  notes: text("notes"),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

// Payment methods (stored cards, etc.)
export const paymentMethods = dbTable('payment_methods', {
  id: primaryKeyId(),
  clientId: foreignKeyInt("client_id").notNull().references(() => users.id),
  
  // Payment method details
  type: text("type", { 
    enum: ["credit_card", "debit_card", "bank_account", "other"] 
  }).notNull(),
  lastFourDigits: text("last_four_digits").notNull(),
  expiryMonth: text("expiry_month"), // For cards
  expiryYear: text("expiry_year"), // For cards
  cardBrand: text("card_brand"), // visa, mastercard, etc.
  
  // Billing address
  billingName: text("billing_name"),
  billingAddress: text("billing_address"),
  billingCity: text("billing_city"),
  billingState: text("billing_state"),
  billingZip: text("billing_zip"),
  billingCountry: text("billing_country").default(sql`'US'`),
  
  // Status
  isDefault: text("is_default", { enum: ["yes", "no"] }).notNull().default(sql`'no'`),
  isActive: text("is_active", { enum: ["yes", "no"] }).notNull().default(sql`'yes'`),
  
  // External payment processor info
  stripeCustomerId: text("stripe_customer_id"),
  stripePaymentMethodId: text("stripe_payment_method_id"),
  
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

// Relations
export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  practice: one(practices, {
    fields: [invoices.practiceId],
    references: [practices.id],
  }),
  client: one(users, {
    fields: [invoices.clientId],
    references: [users.id],
  }),
  pet: one(pets, {
    fields: [invoices.petId],
    references: [pets.id],
  }),
  appointment: one(appointments, {
    fields: [invoices.appointmentId],
    references: [appointments.id],
  }),
  items: many(invoiceItems),
  payments: many(payments),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
  treatment: one(treatments, {
    fields: [invoiceItems.treatmentId],
    references: [treatments.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  practice: one(practices, {
    fields: [payments.practiceId],
    references: [practices.id],
  }),
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
  client: one(users, {
    fields: [payments.clientId],
    references: [users.id],
  }),
}));

export const paymentMethodsRelations = relations(paymentMethods, ({ one }) => ({
  client: one(users, {
    fields: [paymentMethods.clientId],
    references: [users.id],
  }),
}));

// Zod schemas for validation
export const createServiceCodeSchema = createInsertSchema(serviceCodes);
export const createInvoiceSchema = createInsertSchema(invoices);
export const createInvoiceItemSchema = createInsertSchema(invoiceItems);
export const createPaymentSchema = createInsertSchema(payments);
export const createPaymentMethodSchema = createInsertSchema(paymentMethods);
