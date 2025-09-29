import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { electronicSignatures } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const idStr = request.nextUrl.pathname.split('/').pop();
  const id = idStr ? parseInt(idStr, 10) : NaN;

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  try {
    const rows = await tenantDb.select().from(electronicSignatures).where(eq(electronicSignatures.id, id));
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const row: any = rows[0];
    const mapped = {
      ...row,
      metadata: typeof row.metadata === 'string' ? (() => { try { return JSON.parse(row.metadata); } catch { return {}; } })() : row.metadata,
    };
    return NextResponse.json(mapped, { status: 200 });
  } catch (error) {
    console.error('Error fetching signature:', error);
    return NextResponse.json({ error: 'Failed to fetch signature' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const idStr = request.nextUrl.pathname.split('/').pop();
  const id = idStr ? parseInt(idStr, 10) : NaN;

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  try {
    const [deleted] = await tenantDb.delete(electronicSignatures).where(eq(electronicSignatures.id, id)).returning();
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting signature:', error);
    return NextResponse.json({ error: 'Failed to delete signature' }, { status: 500 });
  }
}
