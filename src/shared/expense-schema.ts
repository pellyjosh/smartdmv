// src/shared/expense-schema.ts
// Frontend-shared types/enums for Expenses UI (aligned with financeSchema.ts)
export enum ExpenseStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PAID = 'paid',
  CANCELED = 'canceled',
  REIMBURSED = 'reimbursed',
  VOID = 'void'
}

// Example categories; real list can be dynamic from DB or config
export const ExpenseCategory = {
  SUPPLIES: 'supplies',
  UTILITIES: 'utilities',
  PAYROLL: 'payroll',
  SOFTWARE: 'software',
  RENT: 'rent',
  MARKETING: 'marketing',
  INSURANCE: 'insurance',
  OTHER: 'other'
} as const;

// Convenience flat array for listing endpoints/UI selectors
export const EXPENSE_CATEGORIES: string[] = Object.values(ExpenseCategory);

export type ExpenseCategoryValue = typeof ExpenseCategory[keyof typeof ExpenseCategory];

export interface Expense {
  id: number;
  practiceId: number;
  title: string;
  description?: string | null;
  amount: string | number; // decimal stored as string from DB
  date: string | Date;
  category: string;
  subcategory?: string | null;
  vendorName?: string | null;
  invoiceNumber?: string | null;
  paymentMethod?: string | null;
  isRecurring: boolean;
  recurrenceType?: string | null;
  recurrenceEndDate?: string | Date | null;
  taxDeductible: boolean;
  status: ExpenseStatus | string;
  receiptUrl?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}
