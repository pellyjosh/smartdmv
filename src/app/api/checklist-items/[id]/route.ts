import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { checklistItems } from '@/db/schema';
import { getUserPractice } from '@/lib/auth-utils';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getUserPractice(request);
    if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { id: idParam } = await context.params;
    const id = Number(idParam);

    const [item] = await db.select().from(checklistItems).where(eq(checklistItems.id, id));
    if (!item) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    
    return NextResponse.json(item);
  } catch (err: any) {
    console.error('[ChecklistItem GET] Error:', err?.stack || err);
    return NextResponse.json({ message: 'Failed to fetch item', error: String(err?.message || err) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getUserPractice(request);
    if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { id: idParam } = await context.params;
    const id = Number(idParam);

    const body = await request.json();
    console.log('[PATCH ITEM DEBUG] Raw body:', JSON.stringify(body, null, 2));

    // Build update object with strict type conversion
    const update: Record<string, any> = {};
    
    // String fields
    if ('title' in body && body.title !== undefined) update.title = String(body.title);
    if ('description' in body && body.description !== undefined) update.description = body.description ? String(body.description) : null;
    if ('priority' in body && body.priority !== undefined) update.priority = body.priority ? String(body.priority) : null;
    if ('notes' in body && body.notes !== undefined) update.notes = body.notes ? String(body.notes) : null;
    if ('assigneeRole' in body && body.assigneeRole !== undefined) update.assigneeRole = body.assigneeRole ? String(body.assigneeRole) : null;
    
    // Boolean fields
    if ('completed' in body) update.completed = Boolean(body.completed);
    if ('isRequired' in body) update.isRequired = Boolean(body.isRequired);
    
    // Integer fields
    if ('position' in body && body.position !== undefined) {
      const n = Number(body.position);
      if (Number.isFinite(n)) update.position = n;
    }
    if ('estimatedDuration' in body && body.estimatedDuration !== undefined) {
      const n = Number(body.estimatedDuration);
      update.estimatedDuration = Number.isFinite(n) && n > 0 ? n : null;
    }
    if ('reminderThreshold' in body && body.reminderThreshold !== undefined) {
      const n = Number(body.reminderThreshold);
      update.reminderThreshold = Number.isFinite(n) && n > 0 ? n : null;
    }
    if ('assignedToId' in body) {
      const n = Number(body.assignedToId);
      update.assignedToId = (Number.isFinite(n) && n > 0) ? n : null;
    }
    if ('completedById' in body) {
      const n = Number(body.completedById);
      update.completedById = (Number.isFinite(n) && n > 0) ? n : null;
    }
    
    // Date fields - convert to Date objects
    if ('dueDate' in body) {
      if (!body.dueDate) {
        update.dueDate = null;
      } else {
        const d = new Date(body.dueDate);
        update.dueDate = isNaN(d.getTime()) ? null : d;
      }
    }
    if ('completedAt' in body) {
      if (!body.completedAt) {
        update.completedAt = null;
      } else {
        const d = new Date(body.completedAt);
        update.completedAt = isNaN(d.getTime()) ? null : d;
      }
    }

    // Auto-update fields
    update.updatedAt = new Date(); // Explicit updatedAt to avoid $onUpdate SQL conflict

    console.log('[PATCH ITEM DEBUG] Final update object keys:', Object.keys(update));

    const [updated] = await db.update(checklistItems).set(update as any).where(eq(checklistItems.id, id)).returning();
    if (!updated) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('[ChecklistItem PATCH] Error:', err?.stack || err);
    return NextResponse.json({ message: 'Update failed', error: String(err?.message || err) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getUserPractice(request);
    if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { id: idParam } = await context.params;
    const id = Number(idParam);

    await db.delete(checklistItems).where(eq(checklistItems.id, id));
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[ChecklistItem DELETE] Error:', err?.stack || err);
    return NextResponse.json({ message: 'Delete failed', error: String(err?.message || err) }, { status: 500 });
  }
}
