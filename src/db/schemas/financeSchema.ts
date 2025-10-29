// src/db/schemas/financeSchema.ts
// Finance domain: expenses, refunds, payroll
// Follow project conventions (dbTable helpers, timestamp mode 'date', sql defaults, relations, zod schemas)
import { dbTable, primaryKeyId, text, timestamp, integer, decimal, foreignKeyInt, boolean } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { practices } from './practicesSchema';
import { users } from './usersSchema';
import { currencies } from './currencySchema';
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
  // Legacy text currency (kept for backward compatibility)
  currency: text('currency').notNull().default(sql`'USD'`),
  // Reference to currencies table (required)
  currencyId: foreignKeyInt('currency_id').notNull().references(() => currencies.id),
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
  // Legacy text currency
  currency: text('currency').notNull().default(sql`'USD'`),
  // Currency reference (required)
  currencyId: foreignKeyInt('currency_id').notNull().references(() => currencies.id),
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
  rateType: text('rate_type', { enum: ['hourly','daily','weekly','monthly','yearly'] }).notNull(),
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
  // Legacy text currency
  currency: text('currency').notNull().default(sql`'USD'`),
  // Currency reference (required)
  currencyId: foreignKeyInt('currency_id').notNull().references(() => currencies.id),
  deductions: text('deductions'), // JSON string representing deduction breakdown
  taxes: text('taxes'), // JSON string representing tax breakdown
  status: text('status', { enum: ['pending', 'processing', 'paid', 'failed', 'void'] }).notNull().default(sql`'pending'`),
  notes: text('notes'),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull().$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const payrollRelations = relations(payroll, ({ one, many }) => ({
  practice: one(practices, { fields: [payroll.practiceId], references: [practices.id] }),
  employee: one(users, { fields: [payroll.employeeId], references: [users.id] }),
  period: one(payPeriods, { fields: [payroll.payPeriodId], references: [payPeriods.id] }),
  deductions: many(payrollDeductions),
}));

// -----------------------------
// Deductions System
// -----------------------------

// Deduction Types (tax, benefits, voluntary deductions, etc.)
export const deductionTypes = dbTable('deduction_types', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id),
  name: text('name').notNull(), // "Federal Income Tax", "Health Insurance", etc.
  code: text('code').notNull(), // "FIT", "HEALTH", etc.
  category: text('category', { enum: ['tax', 'benefit', 'voluntary', 'garnishment'] }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  calculationType: text('calculation_type', { enum: ['percentage', 'fixed', 'tiered'] }).notNull(),
  isEmployerContribution: boolean('is_employer_contribution').notNull().default(false),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull().$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const deductionTypesRelations = relations(deductionTypes, ({ one, many }) => ({
  practice: one(practices, { fields: [deductionTypes.practiceId], references: [practices.id] }),
  employeeDeductions: many(employeeDeductions),
}));

// Employee-specific deduction settings
export const employeeDeductions = dbTable('employee_deductions', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id),
  employeeId: foreignKeyInt('employee_id').notNull().references(() => users.id),
  deductionTypeId: foreignKeyInt('deduction_type_id').notNull().references(() => deductionTypes.id),
  isActive: boolean('is_active').notNull().default(true),
  amount: decimal('amount', { precision: 12, scale: 2 }), // for fixed amounts
  percentage: decimal('percentage', { precision: 5, scale: 2 }), // for percentage-based
  maxAmount: decimal('max_amount', { precision: 12, scale: 2 }), // maximum deduction per period
  startDate: timestamp('start_date', { mode: 'date' }).notNull(),
  endDate: timestamp('end_date', { mode: 'date' }), // null = ongoing
  notes: text('notes'),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull().$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const employeeDeductionsRelations = relations(employeeDeductions, ({ one }) => ({
  practice: one(practices, { fields: [employeeDeductions.practiceId], references: [practices.id] }),
  employee: one(users, { fields: [employeeDeductions.employeeId], references: [users.id] }),
  deductionType: one(deductionTypes, { fields: [employeeDeductions.deductionTypeId], references: [deductionTypes.id] }),
}));

// Actual deductions applied to specific payroll records
export const payrollDeductions = dbTable('payroll_deductions', {
  id: primaryKeyId(),
  payrollId: foreignKeyInt('payroll_id').notNull().references(() => payroll.id, { onDelete: 'cascade' }),
  deductionTypeId: foreignKeyInt('deduction_type_id').notNull().references(() => deductionTypes.id),
  employeeDeductionId: foreignKeyInt('employee_deduction_id').references(() => employeeDeductions.id),
  description: text('description').notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  isEmployerPaid: boolean('is_employer_paid').notNull().default(false),
  calculationDetails: text('calculation_details'), // JSON with calculation breakdown
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const payrollDeductionsRelations = relations(payrollDeductions, ({ one }) => ({
  payroll: one(payroll, { fields: [payrollDeductions.payrollId], references: [payroll.id] }),
  deductionType: one(deductionTypes, { fields: [payrollDeductions.deductionTypeId], references: [deductionTypes.id] }),
  employeeDeduction: one(employeeDeductions, { fields: [payrollDeductions.employeeDeductionId], references: [employeeDeductions.id] }),
}));

// Payroll tax rates and brackets (federal, state, local)
export const payrollTaxRates = dbTable('payroll_tax_rates', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id),
  name: text('name').notNull(), // "Federal Income Tax 2024", "California State Tax"
  jurisdiction: text('jurisdiction', { enum: ['federal', 'state', 'local'] }).notNull(),
  taxType: text('tax_type', { enum: ['income', 'social_security', 'medicare', 'unemployment', 'disability'] }).notNull(),
  effectiveYear: integer('effective_year').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  // Tax brackets stored as JSON: [{ min: 0, max: 10000, rate: 0.10 }, ...]
  taxBrackets: text('tax_brackets').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull().$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const payrollTaxRatesRelations = relations(payrollTaxRates, ({ one }) => ({
  practice: one(practices, { fields: [payrollTaxRates.practiceId], references: [practices.id] }),
}));

// Pay categories (regular, overtime, bonus, etc.)
export const payCategories = dbTable('pay_categories', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id),
  name: text('name').notNull(), // "Regular", "Overtime", "Bonus", "Holiday"
  code: text('code').notNull(), // "REG", "OT", "BONUS", "HOLIDAY"
  multiplier: decimal('multiplier', { precision: 4, scale: 2 }).notNull().default('1.00'), // 1.5 for overtime
  isTaxable: boolean('is_taxable').notNull().default(true),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull().$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const payCategoriesRelations = relations(payCategories, ({ one }) => ({
  practice: one(practices, { fields: [payCategories.practiceId], references: [practices.id] }),
}));

// Enhanced work hours with pay categories
export const workHoursEnhanced = dbTable('work_hours_enhanced', {
  id: primaryKeyId(),
  workHoursId: foreignKeyInt('work_hours_id').notNull().references(() => workHours.id, { onDelete: 'cascade' }),
  payCategoryId: foreignKeyInt('pay_category_id').notNull().references(() => payCategories.id),
  hours: decimal('hours', { precision: 6, scale: 2 }).notNull(),
  rate: decimal('rate', { precision: 12, scale: 2 }).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const workHoursEnhancedRelations = relations(workHoursEnhanced, ({ one }) => ({
  workHours: one(workHours, { fields: [workHoursEnhanced.workHoursId], references: [workHours.id] }),
  payCategory: one(payCategories, { fields: [workHoursEnhanced.payCategoryId], references: [payCategories.id] }),
}));

// -----------------------------
// Approval Workflows
// -----------------------------

// Approval workflow definitions
export const approvalWorkflows = dbTable('approval_workflows', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id),
  name: text('name').notNull(),
  workflowType: text('workflow_type', { enum: ['time_approval', 'payroll_approval', 'deduction_approval', 'rate_approval'] }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  autoApprove: boolean('auto_approve').notNull().default(false),
  approvalLevels: integer('approval_levels').notNull().default(1),
  // JSON configuration for workflow rules
  workflowConfig: text('workflow_config'), // Stores conditions, thresholds, etc.
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull().$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const approvalWorkflowsRelations = relations(approvalWorkflows, ({ one, many }) => ({
  practice: one(practices, { fields: [approvalWorkflows.practiceId], references: [practices.id] }),
  steps: many(approvalWorkflowSteps),
  instances: many(approvalInstances),
}));

// Workflow step definitions (who can approve at each level)
export const approvalWorkflowSteps = dbTable('approval_workflow_steps', {
  id: primaryKeyId(),
  workflowId: foreignKeyInt('workflow_id').notNull().references(() => approvalWorkflows.id, { onDelete: 'cascade' }),
  stepOrder: integer('step_order').notNull(),
  stepName: text('step_name').notNull(),
  approverType: text('approver_type', { enum: ['user', 'role', 'manager', 'any'] }).notNull(),
  approverIds: text('approver_ids'), // JSON array of user IDs or role IDs
  requiresAll: boolean('requires_all').notNull().default(false), // true = all approvers must approve, false = any one
  autoApproveConditions: text('auto_approve_conditions'), // JSON conditions for auto-approval
  isOptional: boolean('is_optional').notNull().default(false),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const approvalWorkflowStepsRelations = relations(approvalWorkflowSteps, ({ one, many }) => ({
  workflow: one(approvalWorkflows, { fields: [approvalWorkflowSteps.workflowId], references: [approvalWorkflows.id] }),
  stepApprovals: many(approvalStepInstances),
}));

// Approval instances (specific approval requests)
export const approvalInstances = dbTable('approval_instances', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id),
  workflowId: foreignKeyInt('workflow_id').notNull().references(() => approvalWorkflows.id),
  requestedById: foreignKeyInt('requested_by_id').notNull().references(() => users.id),
  entityType: text('entity_type').notNull(), // 'work_hours', 'payroll', 'pay_rate', etc.
  entityId: integer('entity_id').notNull(), // ID of the entity being approved
  entityData: text('entity_data'), // JSON snapshot of the entity at request time
  currentStep: integer('current_step').notNull().default(1),
  status: text('status', { enum: ['pending', 'approved', 'rejected', 'cancelled', 'expired'] }).notNull().default(sql`'pending'`),
  priority: text('priority', { enum: ['low', 'normal', 'high', 'urgent'] }).notNull().default(sql`'normal'`),
  reason: text('reason'),
  notes: text('notes'),
  dueDate: timestamp('due_date', { mode: 'date' }),
  completedAt: timestamp('completed_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull().$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const approvalInstancesRelations = relations(approvalInstances, ({ one, many }) => ({
  practice: one(practices, { fields: [approvalInstances.practiceId], references: [practices.id] }),
  workflow: one(approvalWorkflows, { fields: [approvalInstances.workflowId], references: [approvalWorkflows.id] }),
  requestedBy: one(users, { fields: [approvalInstances.requestedById], references: [users.id] }),
  stepInstances: many(approvalStepInstances),
  history: many(approvalHistory),
}));

// Individual step approvals within an instance
export const approvalStepInstances = dbTable('approval_step_instances', {
  id: primaryKeyId(),
  approvalInstanceId: foreignKeyInt('approval_instance_id').notNull().references(() => approvalInstances.id, { onDelete: 'cascade' }),
  workflowStepId: foreignKeyInt('workflow_step_id').notNull().references(() => approvalWorkflowSteps.id),
  stepOrder: integer('step_order').notNull(),
  status: text('status', { enum: ['pending', 'approved', 'rejected', 'skipped'] }).notNull().default(sql`'pending'`),
  approvedById: foreignKeyInt('approved_by_id').references(() => users.id),
  approvedAt: timestamp('approved_at', { mode: 'date' }),
  rejectionReason: text('rejection_reason'),
  notes: text('notes'),
  isAutoApproved: boolean('is_auto_approved').notNull().default(false),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const approvalStepInstancesRelations = relations(approvalStepInstances, ({ one }) => ({
  approvalInstance: one(approvalInstances, { fields: [approvalStepInstances.approvalInstanceId], references: [approvalInstances.id] }),
  workflowStep: one(approvalWorkflowSteps, { fields: [approvalStepInstances.workflowStepId], references: [approvalWorkflowSteps.id] }),
  approvedBy: one(users, { fields: [approvalStepInstances.approvedById], references: [users.id] }),
}));

// Approval history and audit trail
export const approvalHistory = dbTable('approval_history', {
  id: primaryKeyId(),
  approvalInstanceId: foreignKeyInt('approval_instance_id').notNull().references(() => approvalInstances.id, { onDelete: 'cascade' }),
  action: text('action').notNull(), // 'submitted', 'approved', 'rejected', 'cancelled', 'reassigned', etc.
  performedById: foreignKeyInt('performed_by_id').references(() => users.id),
  previousStatus: text('previous_status'),
  newStatus: text('new_status'),
  comments: text('comments'),
  metadata: text('metadata'), // JSON for additional context
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  timestamp: timestamp('timestamp', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const approvalHistoryRelations = relations(approvalHistory, ({ one }) => ({
  approvalInstance: one(approvalInstances, { fields: [approvalHistory.approvalInstanceId], references: [approvalInstances.id] }),
  performedBy: one(users, { fields: [approvalHistory.performedById], references: [users.id] }),
}));

// Manager assignments (who can approve for whom)
export const managerAssignments = dbTable('manager_assignments', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id),
  managerId: foreignKeyInt('manager_id').notNull().references(() => users.id),
  employeeId: foreignKeyInt('employee_id').notNull().references(() => users.id),
  assignmentType: text('assignment_type', { enum: ['direct_report', 'department_head', 'hr_manager', 'payroll_admin'] }).notNull(),
  canApproveTimeOff: boolean('can_approve_time_off').notNull().default(true),
  canApproveHours: boolean('can_approve_hours').notNull().default(true),
  canApprovePayroll: boolean('can_approve_payroll').notNull().default(false),
  canApproveRates: boolean('can_approve_rates').notNull().default(false),
  startDate: timestamp('start_date', { mode: 'date' }).notNull(),
  endDate: timestamp('end_date', { mode: 'date' }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull().$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const managerAssignmentsRelations = relations(managerAssignments, ({ one }) => ({
  practice: one(practices, { fields: [managerAssignments.practiceId], references: [practices.id] }),
  manager: one(users, { fields: [managerAssignments.managerId], references: [users.id] }),
  employee: one(users, { fields: [managerAssignments.employeeId], references: [users.id] }),
}));

// Notification preferences for approvals
export const approvalNotifications = dbTable('approval_notifications', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id),
  userId: foreignKeyInt('user_id').notNull().references(() => users.id),
  workflowType: text('workflow_type', { enum: ['time_approval', 'payroll_approval', 'deduction_approval', 'rate_approval'] }),
  notificationMethod: text('notification_method', { enum: ['email', 'sms', 'in_app', 'push'] }).notNull(),
  isEnabled: boolean('is_enabled').notNull().default(true),
  frequency: text('frequency', { enum: ['immediate', 'hourly', 'daily', 'weekly'] }).notNull().default(sql`'immediate'`),
  conditions: text('conditions'), // JSON conditions for when to send notifications
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull().$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const approvalNotificationsRelations = relations(approvalNotifications, ({ one }) => ({
  practice: one(practices, { fields: [approvalNotifications.practiceId], references: [practices.id] }),
  user: one(users, { fields: [approvalNotifications.userId], references: [users.id] }),
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
export const createDeductionTypeSchema = createInsertSchema(deductionTypes);
export const createEmployeeDeductionSchema = createInsertSchema(employeeDeductions);
export const createPayrollDeductionSchema = createInsertSchema(payrollDeductions);
export const createPayrollTaxRateSchema = createInsertSchema(payrollTaxRates);
export const createPayCategorySchema = createInsertSchema(payCategories);
export const createWorkHoursEnhancedSchema = createInsertSchema(workHoursEnhanced);
export const createApprovalWorkflowSchema = createInsertSchema(approvalWorkflows);
export const createApprovalWorkflowStepSchema = createInsertSchema(approvalWorkflowSteps);
export const createApprovalInstanceSchema = createInsertSchema(approvalInstances);
export const createApprovalStepInstanceSchema = createInsertSchema(approvalStepInstances);
export const createApprovalHistorySchema = createInsertSchema(approvalHistory);
export const createManagerAssignmentSchema = createInsertSchema(managerAssignments);
export const createApprovalNotificationSchema = createInsertSchema(approvalNotifications);

// Optional: Domain enums (export for frontend if helpful)
export const EXPENSE_STATUS = ['pending', 'approved', 'rejected', 'paid', 'reimbursed', 'void'] as const;
export const EXPENSE_REIMBURSEMENT_STATUS = ['not_required', 'pending', 'processing', 'completed'] as const;
export const REFUND_STATUS = ['pending', 'approved', 'rejected', 'processed', 'failed', 'void'] as const;
export const PAYROLL_STATUS = ['pending', 'processing', 'paid', 'failed', 'void'] as const;
export const PAY_PERIOD_STATUS = ['draft','processing','paid'] as const;
export const PAY_RATE_TYPES = ['hourly','salary'] as const;
export const DEDUCTION_CATEGORIES = ['tax', 'benefit', 'voluntary', 'garnishment'] as const;
export const CALCULATION_TYPES = ['percentage', 'fixed', 'tiered'] as const;
export const TAX_JURISDICTIONS = ['federal', 'state', 'local'] as const;
export const TAX_TYPES = ['income', 'social_security', 'medicare', 'unemployment', 'disability'] as const;
export const APPROVAL_WORKFLOW_TYPES = ['time_approval', 'payroll_approval', 'deduction_approval', 'rate_approval'] as const;
export const APPROVAL_STATUSES = ['pending', 'approved', 'rejected', 'cancelled', 'expired'] as const;
export const APPROVAL_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export const MANAGER_ASSIGNMENT_TYPES = ['direct_report', 'department_head', 'hr_manager', 'payroll_admin'] as const;
export const NOTIFICATION_METHODS = ['email', 'sms', 'in_app', 'push'] as const;
export const NOTIFICATION_FREQUENCIES = ['immediate', 'hourly', 'daily', 'weekly'] as const;
export const BUDGET_SUPPORTED = true;

// -----------------------------
// Payment Processing
// -----------------------------

// Bank accounts for payroll disbursements
export const bankAccounts = dbTable('bank_accounts', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id),
  accountName: text('account_name').notNull(),
  accountType: text('account_type', { enum: ['checking', 'savings', 'payroll'] }).notNull(),
  bankName: text('bank_name').notNull(),
  routingNumber: text('routing_number').notNull(),
  accountNumber: text('account_number').notNull(), // Should be encrypted in production
  isActive: boolean('is_active').notNull().default(true),
  isDefault: boolean('is_default').notNull().default(false),
  balance: decimal('balance', { precision: 12, scale: 2 }).default('0.00'),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull().$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const bankAccountsRelations = relations(bankAccounts, ({ one }) => ({
  practice: one(practices, { fields: [bankAccounts.practiceId], references: [practices.id] }),
}));

// Employee bank account details
export const employeeBankAccounts = dbTable('employee_bank_accounts', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id),
  employeeId: foreignKeyInt('employee_id').notNull().references(() => users.id),
  accountType: text('account_type', { enum: ['checking', 'savings'] }).notNull(),
  bankName: text('bank_name').notNull(),
  routingNumber: text('routing_number').notNull(),
  accountNumber: text('account_number').notNull(), // Should be encrypted in production
  accountHolderName: text('account_holder_name').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  isPrimary: boolean('is_primary').notNull().default(true),
  allocationPercentage: decimal('allocation_percentage', { precision: 5, scale: 2 }).default('100.00'),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull().$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const employeeBankAccountsRelations = relations(employeeBankAccounts, ({ one }) => ({
  practice: one(practices, { fields: [employeeBankAccounts.practiceId], references: [practices.id] }),
  employee: one(users, { fields: [employeeBankAccounts.employeeId], references: [users.id] }),
}));

// Payroll payments (actual disbursements)
export const payrollPayments = dbTable('payroll_payments', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id),
  payrollId: foreignKeyInt('payroll_id').notNull().references(() => payroll.id),
  employeeId: foreignKeyInt('employee_id').notNull().references(() => users.id),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text('payment_method', { 
    enum: ['direct_deposit', 'check', 'cash', 'payroll_card', 'wire_transfer'] 
  }).notNull(),
  paymentReference: text('payment_reference').notNull(), // Check number, transaction ID, etc.
  transactionId: text('transaction_id'), // External payment processor transaction ID
  processorResponse: text('processor_response'), // JSON response from payment processor
  status: text('status', { 
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'returned'] 
  }).notNull().default(sql`'pending'`),
  bankAccountId: foreignKeyInt('bank_account_id').references(() => bankAccounts.id),
  employeeBankAccountId: foreignKeyInt('employee_bank_account_id').references(() => employeeBankAccounts.id),
  paymentDate: timestamp('payment_date', { mode: 'date' }).notNull(),
  processedBy: foreignKeyInt('processed_by').notNull().references(() => users.id),
  notes: text('notes'),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull().$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const payrollPaymentsRelations = relations(payrollPayments, ({ one }) => ({
  practice: one(practices, { fields: [payrollPayments.practiceId], references: [practices.id] }),
  payroll: one(payroll, { fields: [payrollPayments.payrollId], references: [payroll.id] }),
  employee: one(users, { fields: [payrollPayments.employeeId], references: [users.id] }),
  bankAccount: one(bankAccounts, { fields: [payrollPayments.bankAccountId], references: [bankAccounts.id] }),
  employeeBankAccount: one(employeeBankAccounts, { fields: [payrollPayments.employeeBankAccountId], references: [employeeBankAccounts.id] }),
  processedByUser: one(users, { fields: [payrollPayments.processedBy], references: [users.id] }),
}));

// Payment transaction log for audit trail
export const payrollTransactions = dbTable('payroll_transactions', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id),
  payrollId: foreignKeyInt('payroll_id').references(() => payroll.id),
  paymentId: foreignKeyInt('payment_id').references(() => payrollPayments.id),
  transactionType: text('transaction_type', { 
    enum: ['payment', 'batch_payment', 'reversal', 'adjustment', 'fee'] 
  }).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  description: text('description').notNull(),
  reference: text('reference'),
  processedBy: foreignKeyInt('processed_by').notNull().references(() => users.id),
  transactionDate: timestamp('transaction_date', { mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const payrollTransactionsRelations = relations(payrollTransactions, ({ one }) => ({
  practice: one(practices, { fields: [payrollTransactions.practiceId], references: [practices.id] }),
  payroll: one(payroll, { fields: [payrollTransactions.payrollId], references: [payroll.id] }),
  payment: one(payrollPayments, { fields: [payrollTransactions.paymentId], references: [payrollPayments.id] }),
  processedByUser: one(users, { fields: [payrollTransactions.processedBy], references: [users.id] }),
}));

// Payroll Reports
export const payrollReports = dbTable('payroll_reports', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id),
  reportType: text('report_type').notNull(), // 'summary', 'detailed', 'tax', 'deductions', 'analytics'
  title: text('title').notNull(),
  description: text('description'),
  dateRange: text('date_range').notNull(), // JSON string
  filters: text('filters'), // JSON string
  reportData: text('report_data'), // JSON string
  generatedBy: foreignKeyInt('generated_by').notNull().references(() => users.id),
  status: text('status').notNull().default(sql`'pending'`),
  exportFormat: text('export_format'), // 'pdf', 'excel', 'csv'
  filePath: text('file_path'),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});

// Payroll Analytics
export const payrollAnalytics = dbTable('payroll_analytics', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id),
  metricType: text('metric_type').notNull(), // 'cost_per_employee', 'overtime_trends', 'department_costs', etc.
  period: text('period').notNull(), // 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
  date: text('date').notNull(), // date string
  value: decimal('value', { precision: 15, scale: 2 }).notNull(),
  metadata: text('metadata'), // JSON string
  createdAt: timestamp('created_at'),
});

// Payroll Compliance
export const payrollCompliance = dbTable('payroll_compliance', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id),
  complianceType: text('compliance_type').notNull(), // 'tax_filing', 'labor_law', 'overtime_rules', etc.
  status: text('status').notNull().default(sql`'compliant'`), // 'compliant', 'warning', 'violation'
  description: text('description').notNull(),
  severity: text('severity').notNull().default(sql`'low'`), // 'low', 'medium', 'high', 'critical'
  dueDate: text('due_date'), // date string
  resolvedAt: timestamp('resolved_at'),
  metadata: text('metadata'), // JSON string
  createdBy: foreignKeyInt('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});

// Add new schema creation exports
export const createPayrollReportSchema = createInsertSchema(payrollReports);
export const createPayrollAnalyticsSchema = createInsertSchema(payrollAnalytics);
export const createPayrollComplianceSchema = createInsertSchema(payrollCompliance);
export const createBankAccountSchema = createInsertSchema(bankAccounts);
export const createEmployeeBankAccountSchema = createInsertSchema(employeeBankAccounts);
export const createPayrollPaymentSchema = createInsertSchema(payrollPayments);
export const createPayrollTransactionSchema = createInsertSchema(payrollTransactions);

// Add new enums
export const REPORT_TYPES = ['summary', 'detailed', 'tax', 'deductions', 'analytics'] as const;
export const REPORT_STATUSES = ['pending', 'generating', 'completed', 'failed'] as const;
export const EXPORT_FORMATS = ['pdf', 'excel', 'csv'] as const;
export const METRIC_TYPES = ['cost_per_employee', 'overtime_trends', 'department_costs', 'tax_compliance', 'deduction_analysis'] as const;
export const COMPLIANCE_TYPES = ['tax_filing', 'labor_law', 'overtime_rules', 'minimum_wage', 'benefit_compliance'] as const;
export const COMPLIANCE_STATUSES = ['compliant', 'warning', 'violation'] as const;
export const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
export const PAYMENT_METHODS = ['direct_deposit', 'check', 'cash', 'payroll_card', 'wire_transfer'] as const;
export const PAYMENT_STATUSES = ['pending', 'processing', 'completed', 'failed', 'cancelled', 'returned'] as const;
export const TRANSACTION_TYPES = ['payment', 'batch_payment', 'reversal', 'adjustment', 'fee'] as const;
export const BANK_ACCOUNT_TYPES = ['checking', 'savings', 'payroll'] as const;
