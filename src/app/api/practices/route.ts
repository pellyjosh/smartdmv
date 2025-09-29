import { NextRequest, NextResponse } from 'next/server';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { practices } from '@/db/schema';
import { getUserPractice, getCurrentUser } from '@/lib/auth-utils';
import { getUserContextFromRequest } from '@/lib/auth-context';
import { eq } from 'drizzle-orm';

// GET /api/practices - Get practices accessible to current user
export async function GET(request: NextRequest) {
  try {
    const contextualDb = await getCurrentTenantDb();
    
    // Try multiple authentication methods
    let userInfo = await getUserPractice(request);
    
    // If getUserPractice fails, try getUserContextFromRequest as fallback
    if (!userInfo) {
      const userContext = await getUserContextFromRequest(request);
      if (!userContext) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      // Create a minimal userInfo object for practices access
      userInfo = {
        userId: userContext.userId,
        practiceId: userContext.practiceId || '',
        userRole: userContext.role || '',
        email: userContext.email || '',
        user: null as any // We don't need the full user object for this
      };
    }

    // Get all practices for referral purposes
    const allPractices = await contextualDb.query.practices.findMany({
      columns: {
        id: true,
        name: true,
      },
      orderBy: (practices, { asc }) => [asc(practices.name)],
    });

    return NextResponse.json(allPractices);
  } catch (error) {
    console.error('Error fetching practices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch practices' },
      { status: 500 }
    );
  }
}
