import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { currencies } from '@/db/schemas/currencySchema';

// GET /api/practices/[practiceId]/currencies - list available currencies for the tenant
export async function GET(request: NextRequest, { params }: { params: Promise<{ practiceId: string }> }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { practiceId: practiceIdParam } = await params;
    const practiceId = parseInt(practiceIdParam);
    if (!practiceId || Number.isNaN(practiceId)) {
      return NextResponse.json({ error: 'Invalid practice id' }, { status: 400 });
    }

    // ensure user belongs to this practice
    if (user.practiceId !== practiceId) {
      return NextResponse.json({ error: 'Access denied to this practice' }, { status: 403 });
    }

    const tenantDb = await getCurrentTenantDb();

    // Return active currencies first
    const rows = await tenantDb.query.currencies.findMany({ where: (c: any, { eq }: any) => eq(c.active, true) }).catch(() => null);

    if (!rows) return NextResponse.json([], { status: 200 });

    return NextResponse.json(rows);
  } catch (err) {
    console.error('Error fetching currencies list', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
