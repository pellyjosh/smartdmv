import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { getUserPractice } from '@/lib/auth-utils';
import { assignedChecklists, checklistItems } from '@/db/schema';

export async function GET(request: NextRequest) {
  const ctx = await getUserPractice(request);
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const uid = Number(ctx.userId);
  const items = await db.select().from(checklistItems).where(eq(checklistItems.assignedToId, uid)).orderBy(asc(checklistItems.dueDate));

  // Attach checklist name for grouping
  const checklistIds = Array.from(new Set(items.map(i => i.checklistId))) as number[];
  const lists = checklistIds.length 
    ? await db.select().from(assignedChecklists).where(inArray(assignedChecklists.id as any, checklistIds as any)) 
    : [];
  const names = new Map<number, string>();
  lists.forEach(l => names.set(l.id as number, (l.name as string) || `Checklist #${l.id}`));

  const result = items.map(i => ({ ...i, checklistName: names.get(i.checklistId as number) }));
  return NextResponse.json(result);
}
