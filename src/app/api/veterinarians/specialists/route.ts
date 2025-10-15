import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { users, UserRoleEnum } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/veterinarians/specialists - Get specialist veterinarians
export async function GET(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all veterinarians (they can act as specialists)
    // Note: users schema doesn't have a direct `practices` relation; it exposes
    // `accessiblePractices` and single practiceId/currentPracticeId fields.
    const specialists = await tenantDb.query.users.findMany({
      where: eq(users.role, UserRoleEnum.VETERINARIAN),
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        practiceId: true,
        currentPracticeId: true,
      },
      with: {
        accessiblePractices: {
          with: {
            practice: true,
          },
        },
      },
    });

    // Optional: filter by practiceId query param so the client can request specialists for a specific practice
    try {
      const url = new URL(request.url);
      const practiceIdParam = url.searchParams.get('practiceId');
      if (practiceIdParam) {
        const pid = Number(practiceIdParam);
        if (!isNaN(pid)) {
          const filtered = specialists.filter((s: any) => {
            // direct assigned practice
            if (s.practiceId === pid) return true;
            if (s.currentPracticeId === pid) return true;
            // practices via accessiblePractices relation
            if (Array.isArray(s.accessiblePractices)) {
              return s.accessiblePractices.some((ap: any) => ap.practice?.id === pid);
            }
            return false;
          });
          return NextResponse.json(filtered);
        }
      }
    } catch (e) {
      // if URL parsing fails, fall back to returning the full list
      console.warn('Failed to parse practiceId from request URL for specialists filter', e);
    }

    return NextResponse.json(specialists);
  } catch (error) {
    console.error('Error fetching veterinarian specialists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch veterinarian specialists' },
      { status: 500 }
    );
  }
}
