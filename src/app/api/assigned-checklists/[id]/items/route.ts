import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { and, asc, eq } from 'drizzle-orm';
import { assignedChecklists, checklistItems } from '@/db/schema';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const ctx = await getUserPractice(request);
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const { id: idParam } = await context.params;
  const checklistId = Number(idParam);

  const cl = await tenantDb.select().from(assignedChecklists)
    .where(and(eq(assignedChecklists.id, checklistId), eq(assignedChecklists.practiceId, Number(ctx.practiceId))));
  if (!cl[0]) return NextResponse.json({ message: 'Not found' }, { status: 404 });

  const items = await tenantDb.select().from(checklistItems).where(eq(checklistItems.checklistId, checklistId)).orderBy(asc(checklistItems.position));
  return NextResponse.json(items);
}
