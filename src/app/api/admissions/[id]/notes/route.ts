import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { admissions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

// Validation schema
const noteSchema = z.object({
  note: z.string().min(1, 'Note is required'),
});

// Helper to unwrap Next.js 15 async dynamic params while remaining backward compatible
async function resolveParams(maybeParams: any) {
  try {
    if (!maybeParams) return undefined;
    // In Next.js 15 params can be a Promise-like object
    if (typeof maybeParams.then === 'function') {
      return await maybeParams;
    }
    return maybeParams;
  } catch {
    return undefined;
  }
}

export async function POST(request: Request, context: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  // Safely resolve params (sync or async)
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

    const parsed = noteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await tenantDb.query.admissions.findFirst({ where: eq(admissions.id, id) });
    if (!existing) {
      return NextResponse.json({ error: 'Admission not found' }, { status: 404 });
    }

    const timestamp = new Date().toISOString();
    const appended = (existing.notes ? existing.notes + '\n' : '') + `[NOTE ${timestamp}] ${parsed.data.note}`;

    // Raw SQL update avoids potential serialization issues with Drizzle's returning on some drivers
    await tenantDb.execute(sql`UPDATE admissions SET notes = ${appended}, updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`);
    const updated = await tenantDb.query.admissions.findFirst({ where: eq(admissions.id, id) });
    return NextResponse.json(updated, { status: 201 });
  } catch (err) {
    console.error('[ADMISSIONS][NOTES][POST] Error:', err);
    return NextResponse.json({ error: 'Failed to add note' }, { status: 500 });
  }
}
