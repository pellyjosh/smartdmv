import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { deductionTypes } from '@/db/schemas/financeSchema';
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
    
    // Check if deduction type exists
    const [existing] = await tenantDb.select()
      .from(deductionTypes)
      .where(and(eq(deductionTypes.id, id), eq(deductionTypes.practiceId, practiceId)));
    
    if (!existing) {
      return NextResponse.json({ error: 'Deduction type not found' }, { status: 404 });
    }

    const body = await req.json();
    const { name, code, category, description, calculationType, isEmployerContribution, displayOrder, isActive } = body;
    
    const [updated] = await tenantDb.update(deductionTypes)
      .set({
        name: name !== undefined ? name : existing.name,
        code: code !== undefined ? code.toUpperCase() : existing.code,
        category: category !== undefined ? category : existing.category,
        description: description !== undefined ? (description || null) : existing.description,
        calculationType: calculationType !== undefined ? calculationType : existing.calculationType,
        isEmployerContribution: isEmployerContribution !== undefined ? isEmployerContribution : existing.isEmployerContribution,
        displayOrder: displayOrder !== undefined ? displayOrder : existing.displayOrder,
        isActive: isActive !== undefined ? isActive : existing.isActive,
        updatedAt: new Date()
      })
      .where(and(eq(deductionTypes.id, id), eq(deductionTypes.practiceId, practiceId)))
      .returning();
    
    return NextResponse.json(updated);
  } catch (e) {
    console.error('Update deduction type error', e);
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
    const [updated] = await tenantDb.update(deductionTypes)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(and(eq(deductionTypes.id, id), eq(deductionTypes.practiceId, practiceId)))
      .returning();
    
    if (!updated) {
      return NextResponse.json({ error: 'Deduction type not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Delete deduction type error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}