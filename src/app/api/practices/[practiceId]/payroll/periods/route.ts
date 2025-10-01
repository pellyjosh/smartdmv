import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { payPeriods } from '@/db/schemas/financeSchema';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: NextRequest, context: { params: Promise<{ practiceId: string }> | { practiceId: string } }) {
  try {
    const resolvedParams = await context.params as { practiceId: string };
    const userPractice = await getUserPractice(req);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const practiceId = Number(resolvedParams.practiceId);
    if (practiceId !== parseInt(userPractice.practiceId)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    const db = await getCurrentTenantDb();
    const rows = await db.select().from(payPeriods).where(eq(payPeriods.practiceId, practiceId)).orderBy(desc(payPeriods.startDate));
    return NextResponse.json(rows);
  } catch (e) {
    console.error('List pay periods error', e);
    return NextResponse.json({ error: 'Failed to list pay periods' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ practiceId: string }> | { practiceId: string } }) {
  try {
    const resolvedParams = await context.params as { practiceId: string };
    const userPractice = await getUserPractice(req);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const practiceId = Number(resolvedParams.practiceId);
    if (practiceId !== parseInt(userPractice.practiceId)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    const body = await req.json();
    const { name, startDate, endDate, payDate, status, description } = body;
    if (!name || !startDate || !endDate || !payDate) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    const db = await getCurrentTenantDb();
    const [created] = await db.insert(payPeriods).values({
      practiceId,
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      payDate: new Date(payDate),
      status: status || 'draft',
      description: description || null
    }).returning();
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error('Create pay period error', e);
    return NextResponse.json({ error: 'Failed to create pay period' }, { status: 500 });
  }
}
