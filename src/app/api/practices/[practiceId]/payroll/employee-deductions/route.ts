import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { employeeDeductions, deductionTypes } from '@/db/schemas/financeSchema';
import { users } from '@/db/schemas/usersSchema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(req: NextRequest, context: { params: Promise<{ practiceId: string }> | { practiceId: string } }) {
  try {
    const resolvedParams = await context.params as { practiceId: string };
    const userPractice = await getUserPractice(req);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const practiceId = Number(resolvedParams.practiceId);
    if (practiceId !== parseInt(userPractice.practiceId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const url = new URL(req.url);
    const employeeId = url.searchParams.get('employeeId');

    const tenantDb = await getCurrentTenantDb();
    
    const clauses = [eq(employeeDeductions.practiceId, practiceId)];
    if (employeeId) {
      clauses.push(eq(employeeDeductions.employeeId, Number(employeeId)));
    }
    const where = and(...clauses);

    const rows = await tenantDb.select({
      id: employeeDeductions.id,
      employeeId: employeeDeductions.employeeId,
      deductionTypeId: employeeDeductions.deductionTypeId,
      isActive: employeeDeductions.isActive,
      amount: employeeDeductions.amount,
      percentage: employeeDeductions.percentage,
      maxAmount: employeeDeductions.maxAmount,
      startDate: employeeDeductions.startDate,
      endDate: employeeDeductions.endDate,
      notes: employeeDeductions.notes,
      createdAt: employeeDeductions.createdAt,
      updatedAt: employeeDeductions.updatedAt,
      employeeName: users.name,
      deductionName: deductionTypes.name,
      deductionCode: deductionTypes.code,
      deductionCategory: deductionTypes.category,
      calculationType: deductionTypes.calculationType
    })
    .from(employeeDeductions)
    .leftJoin(users, eq(users.id, employeeDeductions.employeeId))
    .leftJoin(deductionTypes, eq(deductionTypes.id, employeeDeductions.deductionTypeId))
    .where(where)
    .orderBy(desc(employeeDeductions.createdAt));
    
    return NextResponse.json(rows);
  } catch (e) {
    console.error('List employee deductions error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ practiceId: string }> | { practiceId: string } }) {
  try {
    const resolvedParams = await context.params as { practiceId: string };
    const userPractice = await getUserPractice(req);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const practiceId = Number(resolvedParams.practiceId);
    if (practiceId !== parseInt(userPractice.practiceId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const { employeeId, deductionTypeId, amount, percentage, maxAmount, startDate, endDate, notes } = body;
    
    if (!employeeId || !deductionTypeId || !startDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const tenantDb = await getCurrentTenantDb();
    
    const [created] = await tenantDb.insert(employeeDeductions).values({
      practiceId,
      employeeId: Number(employeeId),
      deductionTypeId: Number(deductionTypeId),
      isActive: true,
      amount: amount ? amount.toString() : null,
      percentage: percentage ? percentage.toString() : null,
      maxAmount: maxAmount ? maxAmount.toString() : null,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      notes: notes || null
    }).returning();
    
    return NextResponse.json(created);
  } catch (e) {
    console.error('Create employee deduction error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}