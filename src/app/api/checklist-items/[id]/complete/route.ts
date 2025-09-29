import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { eq } from 'drizzle-orm';
import { checklistItems } from '@/db/schema';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const ctx = await getUserPractice(request);
    if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { id: idParam } = await context.params;
    const id = Number(idParam);
    const body = await request.json().catch(() => ({}));

    console.log('[COMPLETE DEBUG] Starting completion for item:', id);

    // Update with proper Date handling
    const updateData = {
      completed: true,
      completedById: Number(ctx.userId),
      notes: body?.notes ?? null,
      completedAt: new Date(), // Now using proper Date object
      updatedAt: new Date(), // Explicit updatedAt to avoid $onUpdate SQL conflict
    };

    console.log('[COMPLETE DEBUG] About to update with data:', JSON.stringify(updateData, null, 2));

    const [updated] = await tenantDb.update(checklistItems).set(updateData as any).where(eq(checklistItems.id, id)).returning();
    if (!updated) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    
    console.log('[COMPLETE DEBUG] Update successful');
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('[COMPLETE ERROR]:', err?.stack || err);
    return NextResponse.json({ message: 'Completion failed', error: String(err?.message || err) }, { status: 500 });
  }
}
