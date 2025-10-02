import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { admissions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

const dischargeSchema = z.object({
  notes: z.string().optional(),
});

async function resolveParams(maybeParams: any) {
  try {
    if (!maybeParams) return undefined;
    if (typeof maybeParams.then === 'function') {
      return await maybeParams;
    }
    return maybeParams;
  } catch {
    return undefined;
  }
}

export async function POST(request: Request, context: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  const resolved = await resolveParams((context as any)?.params);
  const rawId = resolved?.id;
  const id = parseInt(rawId, 10);
  if (!rawId || isNaN(id)) {
    return NextResponse.json({ error: 'Invalid admission id' }, { status: 400 });
  }
  try {
    const tenantDb = await getCurrentTenantDb();
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const parsed = dischargeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await tenantDb.query.admissions.findFirst({ where: eq(admissions.id, id) });
    if (!existing) {
      return NextResponse.json({ error: 'Admission not found' }, { status: 404 });
    }
    if (existing.status === 'discharged') {
      return NextResponse.json({ error: 'Admission already discharged' }, { status: 400 });
    }

    const timestamp = new Date().toISOString();
    const dischargeNote = parsed.data.notes ? `[DISCHARGE ${timestamp}] ${parsed.data.notes}` : null;
    const mergedNotes = dischargeNote ? (existing.notes ? existing.notes + '\n' + dischargeNote : dischargeNote) : existing.notes;

    await tenantDb.execute(sql`UPDATE admissions SET status = 'discharged', discharge_date = CURRENT_TIMESTAMP, notes = ${mergedNotes}, updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`);
    const updated = await tenantDb.query.admissions.findFirst({ where: eq(admissions.id, id) });
    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error('[ADMISSIONS][DISCHARGE][POST] Error:', err);
    return NextResponse.json({ error: 'Failed to discharge admission' }, { status: 500 });
  }
}
