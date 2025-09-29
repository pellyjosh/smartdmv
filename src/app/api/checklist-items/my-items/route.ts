import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { and, asc, eq, inArray } from 'drizzle-orm';
import { assignedChecklists, checklistItems } from '@/db/schema';

export async function GET(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const ctx = await getUserPractice(request);
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const uid = Number(ctx.userId);
  const items = await tenantDb.select().from(checklistItems).where(eq(checklistItems.assignedToId, uid)).orderBy(asc(checklistItems.dueDate));

  // Attach checklist name for grouping
  const checklistIds = Array.from(new Set(items.map(i => i.checklistId))) as number[];
  const lists = checklistIds.length 
    ? await tenantDb.select().from(assignedChecklists).where(inArray(assignedChecklists.id as any, checklistIds as any)) 
    : [];
  const names = new Map<number, string>();
  lists.forEach(l => names.set(l.id as number, (l.name as string) || `Checklist #${l.id}`));

  const result = items.map(i => ({ ...i, checklistName: names.get(i.checklistId as number) }));
  return NextResponse.json(result);
}
