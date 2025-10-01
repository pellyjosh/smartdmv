import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { workHours, payRates } from '@/db/schemas/financeSchema';
import { users } from '@/db/schemas/usersSchema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export async function GET(req: NextRequest, context: { params: Promise<{ practiceId: string }> | { practiceId: string } }) {
  try {
    const resolvedParams = await context.params as { practiceId: string };
    const userPractice = await getUserPractice(req);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const practiceId = Number(resolvedParams.practiceId);
    if (practiceId !== parseInt(userPractice.practiceId)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const db = await getCurrentTenantDb();
  const clauses = [eq(workHours.practiceId, practiceId)];
  if (startDate) clauses.push(gte(workHours.date, new Date(startDate)));
  if (endDate) clauses.push(lte(workHours.date, new Date(endDate)));
  const where = and(...clauses);
    const rows = await db.select({
      id: workHours.id,
      userId: workHours.userId,
      date: workHours.date,
      hoursWorked: workHours.hoursWorked,
      payRateId: workHours.payRateId,
      description: workHours.description,
      isApproved: workHours.isApproved,
      userName: users.name,
      payRateName: payRates.description,
      rateType: payRates.rateType,
      rate: payRates.rate
    }).from(workHours)
      .leftJoin(users, eq(users.id, workHours.userId))
      .leftJoin(payRates, eq(payRates.id, workHours.payRateId))
      .where(where)
      .orderBy(desc(workHours.date));
    return NextResponse.json(rows);
  } catch (e) {
    console.error('List work hours error', e);
    return NextResponse.json({ error: 'Failed to list work hours' }, { status: 500 });
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
    const { userId, date, hoursWorked, payRateId, description, isApproved } = body;
    if (!userId || !date || hoursWorked == null) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    const db = await getCurrentTenantDb();
    const [created] = await db.insert(workHours).values({
      practiceId,
      userId: Number(userId),
      date: new Date(date),
      hoursWorked: hoursWorked.toString(),
      payRateId: payRateId ? Number(payRateId) : null,
      description: description || null,
      isApproved: !!isApproved,
    }).returning();
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error('Create work hours error', e);
    return NextResponse.json({ error: 'Failed to create work hours' }, { status: 500 });
  }
}
