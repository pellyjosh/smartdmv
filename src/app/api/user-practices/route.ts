import { NextRequest, NextResponse } from 'next/server';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { practices } from '@/db/schema';
import { getUserPractice } from '@/lib/auth-utils';
import { eq, asc } from 'drizzle-orm';

// GET /api/user-practices - Get practices accessible to the current user
export async function GET(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the tenant-specific database
    const tenantDb = await getCurrentTenantDb();

    // CLIENT users without a specific practice can see all practices
    if (userPractice.userRole === 'CLIENT' && !userPractice.practiceId) {
      const allPractices = await tenantDb
        .select()
        .from(practices)
        .orderBy(asc(practices.name));
      return NextResponse.json(allPractices);
    }

    // For users with a specific practice, return that practice
    if (!userPractice.practiceId) {
      return NextResponse.json({ error: 'No practice assigned' }, { status: 404 });
    }

    const practice = await tenantDb.query.practices.findFirst({
      where: eq(practices.id, parseInt(userPractice.practiceId)),
    });

    if (!practice) {
      return NextResponse.json({ error: 'Practice not found' }, { status: 404 });
    }

    return NextResponse.json([practice]);
  } catch (error) {
    console.error('Error fetching user practices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user practices' },
      { status: 500 }
    );
  }
}
