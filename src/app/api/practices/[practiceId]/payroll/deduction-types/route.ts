import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { deductionTypes } from '@/db/schemas/financeSchema';
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

    const tenantDb = await getCurrentTenantDb();
    
    const rows = await tenantDb.select()
      .from(deductionTypes)
      .where(eq(deductionTypes.practiceId, practiceId))
      .orderBy(deductionTypes.category, deductionTypes.displayOrder, deductionTypes.name);
    
    return NextResponse.json(rows);
  } catch (e) {
    console.error('List deduction types error', e);
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
    const { name, code, category, description, calculationType, isEmployerContribution, displayOrder } = body;
    
    if (!name || !code || !category || !calculationType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const tenantDb = await getCurrentTenantDb();
    
    const [created] = await tenantDb.insert(deductionTypes).values({
      practiceId,
      name,
      code: code.toUpperCase(),
      category,
      description: description || null,
      calculationType,
      isEmployerContribution: isEmployerContribution || false,
      displayOrder: displayOrder || 0,
      isActive: true
    }).returning();
    
    return NextResponse.json(created);
  } catch (e) {
    console.error('Create deduction type error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}