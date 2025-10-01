import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { ExpenseStatus } from '@/shared/expense-schema';

const STATUSES = [
  ExpenseStatus.DRAFT,
  ExpenseStatus.PENDING,
  ExpenseStatus.APPROVED,
  ExpenseStatus.REJECTED,
  ExpenseStatus.PAID,
  ExpenseStatus.REIMBURSED,
  ExpenseStatus.CANCELED,
  ExpenseStatus.VOID
];

export async function GET(request: NextRequest, { params }: { params: Promise<{ practiceId: string }> }) {
  const userPractice = await getUserPractice(request);
  if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { practiceId } = await params;
  if (parseInt(practiceId) !== parseInt(userPractice.practiceId)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  return NextResponse.json(STATUSES);
}