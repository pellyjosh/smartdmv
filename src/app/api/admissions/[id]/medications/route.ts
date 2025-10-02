import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { admissions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

// We are storing administered medications inline in notes until a dedicated table is added.
const medicationSchema = z.object({
  medicationName: z.string().min(1),
  dosage: z.string().min(1),
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

    const parsed = medicationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }
    const existing = await tenantDb.query.admissions.findFirst({ where: eq(admissions.id, id) });
    if (!existing) {
      return NextResponse.json({ error: 'Admission not found' }, { status: 404 });
    }
    const timestamp = new Date().toISOString();
    const line = `[MED ${timestamp}] ${parsed.data.medicationName} ${parsed.data.dosage}${parsed.data.notes ? ' - ' + parsed.data.notes : ''}`;
    const combined = (existing.notes ? existing.notes + '\n' : '') + line;

    // Raw SQL update to avoid serialization issues (.toISOString errors) with returning()
    await tenantDb.execute(sql`UPDATE admissions SET notes = ${combined}, updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`);
    const updated = await tenantDb.query.admissions.findFirst({ where: eq(admissions.id, id) });
    return NextResponse.json(updated, { status: 201 });
  } catch (err) {
    console.error('[ADMISSIONS][MEDICATIONS][POST] Error:', err);
    return NextResponse.json({ error: 'Failed to record medication' }, { status: 500 });
  }
}
