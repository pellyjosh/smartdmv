import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { and, eq } from 'drizzle-orm';
import { assignedChecklists } from '@/db/schema';

// Robust date parsing helper (tolerant - accepts Date, ISO string, timestamp, and common objects)
const parseDateInput = (input: unknown): Date | null => {
  if (input === undefined || input === null) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  if (typeof input === 'number' && !isNaN(input)) {
    const maybeMs = input < 1e12 ? input * 1000 : input;
    const d = new Date(maybeMs);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof input === 'string') {
    const s = input.trim();
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof input === 'object') {
    try {
      const anyInput: any = input;
      if (typeof anyInput.toISOString === 'function') {
        const d = new Date(anyInput.toISOString());
        if (!isNaN(d.getTime())) return d;
      }
      if (typeof anyInput.valueOf === 'function') {
        const v = anyInput.valueOf();
        if (typeof v === 'number' && !isNaN(v)) {
          const d = new Date(v < 1e12 ? v * 1000 : v);
          if (!isNaN(d.getTime())) return d;
        }
      }
      // try epoch / epochMillis
      if (typeof anyInput.epochMillis === 'number') {
        const d = new Date(anyInput.epochMillis);
        if (!isNaN(d.getTime())) return d;
      }
      if (typeof anyInput.epoch === 'number') {
        const maybeMs = anyInput.epoch < 1e12 ? anyInput.epoch * 1000 : anyInput.epoch;
        const d = new Date(maybeMs);
        if (!isNaN(d.getTime())) return d;
      }
      // fallback: stringify and try
      const str = JSON.stringify(anyInput);
      const d = new Date(str);
      return isNaN(d.getTime()) ? null : d;
    } catch (e) {
      return null;
    }
  }
  return null;
};

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const ctx = await getUserPractice(request);
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const { id: idParam } = await context.params;
  const id = Number(idParam);

  const rows = await tenantDb.select().from(assignedChecklists)
    .where(and(eq(assignedChecklists.practiceId, Number(ctx.practiceId)), eq(assignedChecklists.id, id)));
  if (!rows[0]) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

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
    if ('dueDate' in body) {
      console.log('[PATCH DEBUG] Processing dueDate (raw):', body.dueDate, 'type:', Array.isArray(body.dueDate) ? 'array' : typeof body.dueDate);
      if (body.dueDate === undefined) {
        // don't touch dueDate if undefined (leave it out of update)
      } else if (body.dueDate === null || body.dueDate === '' || (Array.isArray(body.dueDate) && body.dueDate.length === 0)) {
        update.dueDate = null;
        console.log('[PATCH DEBUG] Set dueDate to null');
      } else {
        // If array was sent accidentally, try the first element
        const raw = Array.isArray(body.dueDate) ? body.dueDate[0] : body.dueDate;
        const parsed = parseDateInput(raw);
        console.log('[PATCH DEBUG] Parsed dueDate:', parsed, 'isValid:', parsed !== null);
        update.dueDate = parsed;
      }
    }
    
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

    // Final debug: show exact payload types we will pass to the DB
    console.debug('[PATCH DEBUG] About to call tenantDb.update with payload:', Object.entries(update).map(([k, v]) => ({ key: k, value: v, type: typeof v, ctor: v?.constructor?.name })));

    // Sanitize payload defensively to avoid passing raw objects/arrays into timestamp columns
    const timestampFields = new Set(['dueDate']);
    for (const [key, value] of Object.entries(update)) {
      // Handle timestamp fields explicitly
      if (timestampFields.has(key)) {
        if (value === undefined) {
          // leave as-is (will not be set)
        } else if (value === null) {
          // explicit null is fine
        } else {
          // Try to coerce/validate
          const parsed = parseDateInput(value);
          if (parsed === null) {
            console.warn(`[PATCH DEBUG] Sanitizer: invalid date for ${key}; removing from update`, { key, value });
            delete (update as any)[key];
          } else {
            (update as any)[key] = parsed;
          }
        }
        continue;
      }

      // For non-timestamp fields: if it's an object/array that's not a Date, remove it to avoid driver errors
      if (value && typeof value === 'object' && !(value instanceof Date)) {
        console.warn(`[PATCH DEBUG] Sanitizer: removing non-primitive value for ${key} to avoid DB driver errors`, { key, value });
        delete (update as any)[key];
      }
    }

    // Execute update and return the updated row
    const [updated] = await tenantDb.update(assignedChecklists).set(update)
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
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const ctx = await getUserPractice(request);
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const { id: idParam } = await context.params;
  const id = Number(idParam);

  await tenantDb.delete(assignedChecklists).where(and(eq(assignedChecklists.id, id), eq(assignedChecklists.practiceId, Number(ctx.practiceId))));
  return NextResponse.json({ success: true });
}
