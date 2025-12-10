import { NextRequest, NextResponse } from 'next/server';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { customFieldValues } from '@/db/schemas/customFieldsSchema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest, { params }: { params: Promise<{ practiceId: string }> }) {
  const tenantDb = await getCurrentTenantDb();
  try {
    const { practiceId } = await params;
    if (!practiceId) {
      return NextResponse.json({ error: 'Practice ID is required' }, { status: 400 });
    }
    const list = await tenantDb.query.customFieldValues.findMany({
      where: eq(customFieldValues.practiceId, parseInt(practiceId, 10)),
    });
    return NextResponse.json(list);
  } catch (error) {
    console.error('Fetch values by practice error', error);
    return NextResponse.json({ error: 'Failed to fetch values' }, { status: 500 });
  }
}
