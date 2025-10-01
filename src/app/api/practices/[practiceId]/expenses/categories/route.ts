import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { EXPENSE_CATEGORIES } from '@/shared/expense-schema';

export async function GET(request: NextRequest, context: { params: Promise<{ practiceId: string }> | { practiceId: string } }) {
  const resolvedParams = await context.params as { practiceId: string };
  const userPractice = await getUserPractice(request);
  if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (parseInt(resolvedParams.practiceId) !== parseInt(userPractice.practiceId)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  return NextResponse.json(EXPENSE_CATEGORIES);
}