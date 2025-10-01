// src/db/schemas/financeSchema.ts
// Finance domain: expenses, refunds, payroll
// Follow project conventions (dbTable helpers, timestamp mode 'date', sql defaults, relations, zod schemas)
import { dbTable, primaryKeyId, text, timestamp, integer, decimal, foreignKeyInt, boolean } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { practices } from './practicesSchema';
import { users } from './usersSchema';
import { createInsertSchema } from 'drizzle-zod';

// -----------------------------
// Expenses
// -----------------------------
export const expenses = dbTable('expenses', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id),
  submittedById: foreignKeyInt('submitted_by_id').references(() => users.id), // user who created the expense
  approvedById: foreignKeyInt('approved_by_id').references(() => users.id), // approver (once approved)
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').notNull().default(sql`'USD'`),
  category: text('category').notNull(), // e.g., supplies, utilities, payroll_adjustment
  subcategory: text('subcategory'),
  description: text('description'),
  vendor: text('vendor'),
  invoiceNumber: text('invoice_number'),
  expenseDate: timestamp('expense_date', { mode: 'date' }).notNull(),
  status: text('status', { enum: ['pending', 'approved', 'rejected', 'paid', 'reimbursed', 'void'] }).notNull().default(sql`'pending'`),
  reimbursementStatus: text('reimbursement_status', { enum: ['not_required', 'pending', 'processing', 'completed'] }).notNull().default(sql`'not_required'`),
  notes: text('notes'),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull().$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  practice: one(practices, { fields: [expenses.practiceId], references: [practices.id] }),
  submitter: one(users, { fields: [expenses.submittedById], references: [users.id] }),
  approver: one(users, { fields: [expenses.approvedById], references: [users.id] }),
  attachments: many(expenseAttachments),
  auditLogs: many(expenseAuditLogs),
  refunds: many(refunds),
}));

// -----------------------------
// Expense Attachments
// -----------------------------
export const expenseAttachments = dbTable('expense_attachments', {
  id: primaryKeyId(),
  expenseId: foreignKeyInt('expense_id').notNull().references(() => expenses.id, { onDelete: 'cascade' }),
  fileUrl: text('file_url').notNull(),
  fileName: text('file_name'),
  fileType: text('file_type'),
  uploadedById: foreignKeyInt('uploaded_by_id').references(() => users.id),
  uploadedAt: timestamp('uploaded_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const expenseAttachmentsRelations = relations(expenseAttachments, ({ one }) => ({
  expense: one(expenses, { fields: [expenseAttachments.expenseId], references: [expenses.id] }),
  uploader: one(users, { fields: [expenseAttachments.uploadedById], references: [users.id] }),
}));

// -----------------------------
// Expense Audit Logs
// -----------------------------
export const expenseAuditLogs = dbTable('expense_audit_logs', {
  id: primaryKeyId(),
  expenseId: foreignKeyInt('expense_id').notNull().references(() => expenses.id, { onDelete: 'cascade' }),
  action: text('action').notNull(), // created, submitted, approved, rejected, paid, reimbursed, refunded
  details: text('details'), // optional detail text / JSON string
  performedById: foreignKeyInt('performed_by_id').references(() => users.id),
  timestamp: timestamp('timestamp', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const expenseAuditLogsRelations = relations(expenseAuditLogs, ({ one }) => ({
  expense: one(expenses, { fields: [expenseAuditLogs.expenseId], references: [expenses.id] }),
  performer: one(users, { fields: [expenseAuditLogs.performedById], references: [users.id] }),
}));

// -----------------------------
// Refunds (linked to an expense OR later potentially invoice/payment)
// -----------------------------
export const refunds = dbTable('refunds', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id),
  expenseId: foreignKeyInt('expense_id').references(() => expenses.id), // optional: some refunds may originate from expenses
  issuedById: foreignKeyInt('issued_by_id').references(() => users.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').notNull().default(sql`'USD'`),
  reason: text('reason').notNull(),
  status: text('status', { enum: ['pending', 'approved', 'rejected', 'processed', 'failed', 'void'] }).notNull().default(sql`'pending'`),
  issuedAt: timestamp('issued_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  processedAt: timestamp('processed_at', { mode: 'date' }),
  externalReference: text('external_reference'), // payment processor reference
  notes: text('notes'),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull().$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const refundsRelations = relations(refunds, ({ one }) => ({
  practice: one(practices, { fields: [refunds.practiceId], references: [practices.id] }),
  expense: one(expenses, { fields: [refunds.expenseId], references: [expenses.id] }),
  issuer: one(users, { fields: [refunds.issuedById], references: [users.id] }),
}));

// -----------------------------
// Budgets (planning targets for categories or overall)
// -----------------------------
export const budgets = dbTable('budgets', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id),
  name: text('name').notNull(),
  category: text('category'), // optional: null means applies to ALL categories
  periodStart: timestamp('period_start', { mode: 'date' }).notNull(),
  periodEnd: timestamp('period_end', { mode: 'date' }).notNull(),
  amountAllocated: decimal('amount_allocated', { precision: 12, scale: 2 }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull().$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const budgetsRelations = relations(budgets, ({ one }) => ({
  practice: one(practices, { fields: [budgets.practiceId], references: [practices.id] }),
}));

// -----------------------------
// Payroll
// -----------------------------
// Pay Periods (high-level periods employees are paid for)
export const payPeriods = dbTable('pay_periods', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id),
  name: text('name').notNull(),
  startDate: timestamp('start_date', { mode: 'date' }).notNull(),
  endDate: timestamp('end_date', { mode: 'date' }).notNull(),
  payDate: timestamp('pay_date', { mode: 'date' }).notNull(),
  status: text('status', { enum: ['draft','processing','paid'] }).notNull().default(sql`'draft'`),
  description: text('description'),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull().$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const payPeriodsRelations = relations(payPeriods, ({ one, many }) => ({
  practice: one(practices, { fields: [payPeriods.practiceId], references: [practices.id] }),
  stubs: many(payroll),
}));

// Pay Rates (historical rates per user)
export const payRates = dbTable('pay_rates', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id),
  userId: foreignKeyInt('user_id').notNull().references(() => users.id),
  rateType: text('rate_type', { enum: ['hourly','salary'] }).notNull(),
  rate: decimal('rate', { precision: 12, scale: 2 }).notNull(),
  effectiveDate: timestamp('effective_date', { mode: 'date' }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull().$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const payRatesRelations = relations(payRates, ({ one }) => ({
  practice: one(practices, { fields: [payRates.practiceId], references: [practices.id] }),
  user: one(users, { fields: [payRates.userId], references: [users.id] }),
}));

// Work Hours (time entries)
export const workHours = dbTable('work_hours', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id),
  userId: foreignKeyInt('user_id').notNull().references(() => users.id),
  date: timestamp('date', { mode: 'date' }).notNull(),
  hoursWorked: decimal('hours_worked', { precision: 6, scale: 2 }).notNull(),
  payRateId: foreignKeyInt('pay_rate_id').references(() => payRates.id),
  description: text('description'),
  isApproved: boolean('is_approved').notNull().default(false),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull().$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const workHoursRelations = relations(workHours, ({ one }) => ({
  practice: one(practices, { fields: [workHours.practiceId], references: [practices.id] }),
  user: one(users, { fields: [workHours.userId], references: [users.id] }),
  payRate: one(payRates, { fields: [workHours.payRateId], references: [payRates.id] }),
}));

export const payroll = dbTable('payroll', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id),
  employeeId: foreignKeyInt('employee_id').notNull().references(() => users.id),
  payPeriodId: foreignKeyInt('pay_period_id').references(() => payPeriods.id),
  periodStart: timestamp('period_start', { mode: 'date' }).notNull(),
  periodEnd: timestamp('period_end', { mode: 'date' }).notNull(),
  payDate: timestamp('pay_date', { mode: 'date' }).notNull(),
  grossAmount: decimal('gross_amount', { precision: 12, scale: 2 }).notNull(),
  netAmount: decimal('net_amount', { precision: 12, scale: 2 }).notNull(),
  currency: text('currency').notNull().default(sql`'USD'`),
  deductions: text('deductions'), // JSON string representing deduction breakdown
  taxes: text('taxes'), // JSON string representing tax breakdown
  status: text('status', { enum: ['pending', 'processing', 'paid', 'failed', 'void'] }).notNull().default(sql`'pending'`),
  notes: text('notes'),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull().$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const payrollRelations = relations(payroll, ({ one }) => ({
  practice: one(practices, { fields: [payroll.practiceId], references: [practices.id] }),
  employee: one(users, { fields: [payroll.employeeId], references: [users.id] }),
  period: one(payPeriods, { fields: [payroll.payPeriodId], references: [payPeriods.id] }),
}));

// -----------------------------
// Zod Insert Schemas
// -----------------------------
export const createExpenseSchema = createInsertSchema(expenses);
export const createExpenseAttachmentSchema = createInsertSchema(expenseAttachments);
export const createExpenseAuditLogSchema = createInsertSchema(expenseAuditLogs);
export const createRefundSchema = createInsertSchema(refunds);
export const createPayrollSchema = createInsertSchema(payroll);
export const createPayRateSchema = createInsertSchema(payRates);
export const createWorkHoursSchema = createInsertSchema(workHours);
export const createPayPeriodSchema = createInsertSchema(payPeriods);
export const createBudgetSchema = createInsertSchema(budgets);

// Optional: Domain enums (export for frontend if helpful)
export const EXPENSE_STATUS = ['pending', 'approved', 'rejected', 'paid', 'reimbursed', 'void'] as const;
export const EXPENSE_REIMBURSEMENT_STATUS = ['not_required', 'pending', 'processing', 'completed'] as const;
export const REFUND_STATUS = ['pending', 'approved', 'rejected', 'processed', 'failed', 'void'] as const;
export const PAYROLL_STATUS = ['pending', 'processing', 'paid', 'failed', 'void'] as const;
export const PAY_PERIOD_STATUS = ['draft','processing','paid'] as const;
export const PAY_RATE_TYPES = ['hourly','salary'] as const;
export const BUDGET_SUPPORTED = true;
