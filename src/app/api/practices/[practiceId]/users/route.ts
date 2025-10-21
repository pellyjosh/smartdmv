import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/practices/[practiceId]/users - Get all users for a specific practice
export async function GET(request: NextRequest, { params }: { params: Promise<{ practiceId: string }> }) {
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const practiceId = resolvedParams.practiceId;

    // For administrators and super admins, allow access to any practice for now
    // TODO: Implement proper practice access checking based on administrator_accessible_practices
    if (userPractice.user.role === 'ADMINISTRATOR' || userPractice.user.role === 'SUPER_ADMIN') {
      // Allow access - administrators can access any practice they're switching to
    } else {
      // For other roles, verify user has access to this specific practice
      if (practiceId !== userPractice.practiceId) {
        return NextResponse.json({ error: 'Access denied to this practice' }, { status: 403 });
      }
    }

    // Get all users for this practice - simplified query without complex relationships
    const practiceUsers = await tenantDb.query.users.findMany({
      where: eq(users.practiceId, parseInt(practiceId, 10))
    });

    // Transform the data to match expected format
    const transformedUsers = practiceUsers.map((user: any) => ({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      address: user.address,
      city: user.city,
      state: user.state,
      zipCode: user.zipCode,
      country: user.country,
      role: user.role, // Use the role directly from user table
      isActive: true, // Assume active for now since we don't have userRoles relationship
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    return NextResponse.json(transformedUsers);
  } catch (error) {
    console.error('Error fetching practice users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch practice users' },
      { status: 500 }
    );
  }
}
