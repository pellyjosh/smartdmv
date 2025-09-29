import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { and, eq } from 'drizzle-orm';
import { assignedChecklists, checklistItems } from '@/db/schema';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const ctx = await getUserPractice(request);
    if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { id: idParam } = await context.params;
    const id = Number(idParam);

    const [checklist] = await tenantDb.select().from(assignedChecklists)
      .where(and(eq(assignedChecklists.id, id), eq(assignedChecklists.practiceId, Number(ctx.practiceId))));
    if (!checklist) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    console.log('[COMPLETE CHECKLIST DEBUG] About to update checklist:', id);

    // Mark checklist as completed with explicit updatedAt
    await tenantDb.update(assignedChecklists).set({ 
      status: 'completed' as any,
      updatedAt: new Date() // Explicitly set updatedAt to avoid $onUpdate SQL conflict
    }).where(eq(assignedChecklists.id, id));
    
    console.log('[COMPLETE CHECKLIST DEBUG] Update successful');
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[COMPLETE CHECKLIST ERROR]:', err?.stack || err);
    return NextResponse.json({ message: 'Completion failed', error: String(err?.message || err) }, { status: 500 });
  }
}
