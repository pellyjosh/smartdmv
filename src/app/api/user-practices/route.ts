import { NextRequest, NextResponse } from 'next/server';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { practices } from '@/db/schema';
import { getUserPractice } from '@/lib/auth-utils';
import { eq } from 'drizzle-orm';

// GET /api/user-practices - Get practices accessible to the current user
export async function GET(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the tenant-specific database
    const tenantDb = await getCurrentTenantDb();

    // For now, just return the user's current practice
    // In the future, this could be expanded to handle administrators with multiple practices
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
