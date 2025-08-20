import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { and, asc, eq } from 'drizzle-orm';
import { getUserPractice } from '@/lib/auth-utils';
import { assignedChecklists, checklistItems } from '@/db/schema';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const ctx = await getUserPractice(request);
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const { id: idParam } = await context.params;
  const checklistId = Number(idParam);

  const cl = await db.select().from(assignedChecklists)
    .where(and(eq(assignedChecklists.id, checklistId), eq(assignedChecklists.practiceId, Number(ctx.practiceId))));
  if (!cl[0]) return NextResponse.json({ message: 'Not found' }, { status: 404 });

  const items = await db.select().from(checklistItems).where(eq(checklistItems.checklistId, checklistId)).orderBy(asc(checklistItems.position));
  return NextResponse.json(items);
}
