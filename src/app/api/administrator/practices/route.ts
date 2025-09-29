import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { administratorAccessiblePractices, users, practices } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const { searchParams } = new URL(request.url);
    const administratorId = searchParams.get('administratorId');

    if (!administratorId) {
      return NextResponse.json({ error: 'Administrator ID is required' }, { status: 400 });
    }

    // Get all practices accessible to this administrator
    const accessiblePractices = await (db as any)
      .select({
        practiceId: practices.id,
        practiceName: practices.name,
        assignedAt: administratorAccessiblePractices.assignedAt,
      })
      .from(administratorAccessiblePractices)
      .innerJoin(practices, eq(administratorAccessiblePractices.practiceId, practices.id))
      .where(eq(administratorAccessiblePractices.administratorId, administratorId));

    return NextResponse.json({
      practices: accessiblePractices,
      count: accessiblePractices.length
    });

  } catch (error) {
    console.error('Error fetching administrator practices:', error);
    return NextResponse.json({ error: 'Failed to fetch accessible practices' }, { status: 500 });
  }
}
