import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { payRates } from '@/db/schemas/financeSchema';
import { users } from '@/db/schemas/usersSchema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(req: NextRequest, context: { params: Promise<{ practiceId: string }> | { practiceId: string } }) {
  try {
    const resolvedParams = await context.params as { practiceId: string }; // support async params (Next.js App Router warning)
    const userPractice = await getUserPractice(req);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const practiceId = Number(resolvedParams.practiceId);
    if (practiceId !== parseInt(userPractice.practiceId)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  const tenantDb = await getCurrentTenantDb();
  const rows = await tenantDb.select({
      id: payRates.id,
      userId: payRates.userId,
      rateType: payRates.rateType,
      rate: payRates.rate,
      effectiveDate: payRates.effectiveDate,
      description: payRates.description,
      userName: users.name
    }).from(payRates).leftJoin(users, eq(users.id, payRates.userId)).where(eq(payRates.practiceId, practiceId)).orderBy(desc(payRates.effectiveDate));
    return NextResponse.json(rows);
  } catch (e) {
    console.error('List pay rates error', e);
    return NextResponse.json({ error: 'Failed to list pay rates' }, { status: 500 });
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
    const { userId, rateType, rate, effectiveDate, description } = body;
    if (!userId || !rateType || rate == null || !effectiveDate) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  const tenantDb = await getCurrentTenantDb();
  
  // Check if user already has a pay rate
  const existingRate = await tenantDb
    .select()
    .from(payRates)
    .where(and(eq(payRates.practiceId, practiceId), eq(payRates.userId, Number(userId))))
    .limit(1);
  
  if (existingRate.length > 0) {
    return NextResponse.json({ 
      error: 'Duplicate pay rate', 
      message: 'This user already has a pay rate. Please update the existing rate instead.' 
    }, { status: 400 });
  }
  
  const [created] = await tenantDb.insert(payRates).values({
      practiceId,
      userId: Number(userId),
      rateType,
      rate: rate.toString(),
      effectiveDate: new Date(effectiveDate),
      description: description || null
    }).returning();
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error('Create pay rate error', e);
    return NextResponse.json({ error: 'Failed to create pay rate' }, { status: 500 });
  }
}
