import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { expenses } from '@/db/schemas/financeSchema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

const updateExpenseSchema = z.object({
  status: z.enum(['pending', 'approved', 'paid', 'rejected']).optional(),
  description: z.string().optional(),
  amount: z.number().optional(),
  category: z.string().optional(),
  paymentFrequency: z.enum(['one-time', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'annually']).optional(),
  invoiceNumber: z.string().optional(),
});

// PATCH /api/practices/[practiceId]/expenses/[expenseId]
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ practiceId: string; expenseId: string }> }) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { practiceId, expenseId } = await params;
    const pId = parseInt(practiceId);
    const eId = parseInt(expenseId);

    if (pId !== parseInt(userPractice.practiceId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!eId) {
      return NextResponse.json({ error: 'Invalid expense id' }, { status: 400 });
    }

    const body = await request.json();
    const result = updateExpenseSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid data', details: result.error.errors }, { status: 400 });
    }

    const tenantDb = await getCurrentTenantDb();

    // Check if expense exists and belongs to the practice
    const existingExpense = await tenantDb
      .select()
      .from(expenses)
      .where(and(eq(expenses.id, eId), eq(expenses.practiceId, pId)))
      .limit(1);

    if (!existingExpense.length) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Update the expense
    const updated = await tenantDb
      .update(expenses)
      .set({
        ...result.data,
        updatedAt: new Date(),
      })
      .where(and(eq(expenses.id, eId), eq(expenses.practiceId, pId)))
      .returning();

    if (!updated.length) {
      return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
    }

    return NextResponse.json({ success: true, expense: updated[0] });
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/practices/[practiceId]/expenses/[expenseId]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ practiceId: string; expenseId: string }> }) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { practiceId, expenseId } = await params;
    const pId = parseInt(practiceId);
    const eId = parseInt(expenseId);
    if (pId !== parseInt(userPractice.practiceId)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    if (!eId) return NextResponse.json({ error: 'Invalid expense id' }, { status: 400 });
    const tenantDb = await getCurrentTenantDb();
    const deleted = await tenantDb.delete(expenses).where(and(eq(expenses.practiceId, pId), eq(expenses.id, eId))).returning({ id: expenses.id });
    if (!deleted.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error deleting expense', e);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}