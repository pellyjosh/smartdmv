import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { and, eq } from 'drizzle-orm';
import { getUserPractice } from '@/lib/auth-utils';
import { assignedChecklists } from '@/db/schema';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const ctx = await getUserPractice(request);
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const { id: idParam } = await context.params;
  const id = Number(idParam);

  const rows = await db.select().from(assignedChecklists)
    .where(and(eq(assignedChecklists.practiceId, Number(ctx.practiceId)), eq(assignedChecklists.id, id)));
  if (!rows[0]) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getUserPractice(request);
    if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { id: idParam } = await context.params;
    const id = Number(idParam);

    const body = await request.json();
    console.log('[PATCH DEBUG] Raw body:', JSON.stringify(body, null, 2));
    
    // Build update object with strict type conversion (matching other schemas)
    const update: Record<string, any> = {};
    
    // String fields
    if ('name' in body && body.name !== undefined) update.name = String(body.name);
    if ('priority' in body && body.priority !== undefined) update.priority = String(body.priority);
    if ('status' in body && body.status !== undefined) update.status = String(body.status);
    if ('notes' in body && body.notes !== undefined) update.notes = body.notes ? String(body.notes) : null;
    
    // Date field - convert to Date object or null (matching schema mode: 'date')
    // TEMPORARILY DISABLED TO ISOLATE ISSUE
    /*
    if ('dueDate' in body) {
      console.log('[PATCH DEBUG] Processing dueDate:', body.dueDate, typeof body.dueDate);
      if (!body.dueDate) {
        update.dueDate = null;
        console.log('[PATCH DEBUG] Set dueDate to null');
      } else {
        const d = new Date(body.dueDate);
        console.log('[PATCH DEBUG] Created Date:', d, 'isValid:', !isNaN(d.getTime()));
        update.dueDate = isNaN(d.getTime()) ? null : d;
        console.log('[PATCH DEBUG] Final dueDate:', update.dueDate, typeof update.dueDate);
      }
    }
    */
    
    // Integer fields - only set if valid numbers
    if ('petId' in body && body.petId !== undefined) {
      const n = Number(body.petId);
      if (Number.isFinite(n) && n > 0) update.petId = n;
    }
    if ('assignedToId' in body) {
      const n = Number(body.assignedToId);
      update.assignedToId = (Number.isFinite(n) && n > 0) ? n : null;
    }
    if ('soapNoteId' in body) {
      const n = Number(body.soapNoteId);
      update.soapNoteId = (Number.isFinite(n) && n > 0) ? n : null;
    }

    // CRITICAL: Check all values in update object before DB call
    console.log('[PATCH DEBUG] Final update object keys:', Object.keys(update));
    Object.entries(update).forEach(([key, value]) => {
      console.log(`[PATCH DEBUG] ${key}:`, value, 'type:', typeof value, 'constructor:', value?.constructor?.name);
      if (value && typeof value === 'object' && !(value instanceof Date)) {
        console.error(`[PATCH DEBUG] WARNING: Non-Date object found for ${key}:`, value);
      }
    });

    // Execute update and return the updated row
    const [updated] = await db.update(assignedChecklists).set(update)
      .where(and(eq(assignedChecklists.id, id), eq(assignedChecklists.practiceId, Number(ctx.practiceId))))
      .returning();

    if (!updated) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('[AssignedChecklist PATCH] Error:', err?.stack || err);
    return NextResponse.json({ message: 'Update failed', error: String(err?.message || err) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const ctx = await getUserPractice(request);
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const { id: idParam } = await context.params;
  const id = Number(idParam);

  await db.delete(assignedChecklists).where(and(eq(assignedChecklists.id, id), eq(assignedChecklists.practiceId, Number(ctx.practiceId))));
  return NextResponse.json({ success: true });
}
