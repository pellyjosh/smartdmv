import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { employeeDeductions } from '@/db/schemas/financeSchema';
import { eq, and } from 'drizzle-orm';

export async function PATCH(req: NextRequest, context: { params: Promise<{ practiceId: string; id: string }> | { practiceId: string; id: string } }) {
  try {
    const resolvedParams = await context.params as { practiceId: string; id: string };
    const userPractice = await getUserPractice(req);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const practiceId = Number(resolvedParams.practiceId);
    const id = Number(resolvedParams.id);
    
    if (practiceId !== parseInt(userPractice.practiceId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const tenantDb = await getCurrentTenantDb();
    
    // Check if employee deduction exists
    const [existing] = await tenantDb.select()
      .from(employeeDeductions)
      .where(and(eq(employeeDeductions.id, id), eq(employeeDeductions.practiceId, practiceId)));
    
    if (!existing) {
      return NextResponse.json({ error: 'Employee deduction not found' }, { status: 404 });
    }

    const body = await req.json();
    const { amount, percentage, maxAmount, startDate, endDate, notes, isActive } = body;
    
    const [updated] = await tenantDb.update(employeeDeductions)
      .set({
        amount: amount !== undefined ? (amount ? amount.toString() : null) : existing.amount,
        percentage: percentage !== undefined ? (percentage ? percentage.toString() : null) : existing.percentage,
        maxAmount: maxAmount !== undefined ? (maxAmount ? maxAmount.toString() : null) : existing.maxAmount,
        startDate: startDate !== undefined ? new Date(startDate) : existing.startDate,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : existing.endDate,
        notes: notes !== undefined ? (notes || null) : existing.notes,
        isActive: isActive !== undefined ? isActive : existing.isActive,
        updatedAt: new Date()
      })
      .where(and(eq(employeeDeductions.id, id), eq(employeeDeductions.practiceId, practiceId)))
      .returning();
    
    return NextResponse.json(updated);
  } catch (e) {
    console.error('Update employee deduction error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ practiceId: string; id: string }> | { practiceId: string; id: string } }) {
  try {
    const resolvedParams = await context.params as { practiceId: string; id: string };
    const userPractice = await getUserPractice(req);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const practiceId = Number(resolvedParams.practiceId);
    const id = Number(resolvedParams.id);
    
    if (practiceId !== parseInt(userPractice.practiceId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const tenantDb = await getCurrentTenantDb();
    
    // Soft delete by setting isActive to false
    const [updated] = await tenantDb.update(employeeDeductions)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(and(eq(employeeDeductions.id, id), eq(employeeDeductions.practiceId, practiceId)))
      .returning();
    
    if (!updated) {
      return NextResponse.json({ error: 'Employee deduction not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Delete employee deduction error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}