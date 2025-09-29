import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { eq, and } from 'drizzle-orm';
import { users, UserRoleEnum } from '@/db/schema';

export async function GET(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const ctx = await getUserPractice(request);
    if (!ctx) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Get all veterinarians from the practice
    const vets = await tenantDb.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    }).from(users)
    .where(and(
      eq(users.practiceId, Number(ctx.practiceId)), 
      eq(users.role, UserRoleEnum.VETERINARIAN)
    ));

    // Format the response to ensure consistent name field
    const formattedVets = vets.map(vet => ({
      id: vet.id,
      name: vet.name || vet.email || `Vet ${vet.id}`,
      email: vet.email,
      role: vet.role,
    }));

    return NextResponse.json(formattedVets);
  } catch (error) {
    console.error('Error fetching veterinarians:', error);
    return NextResponse.json(
      { error: 'Failed to fetch veterinarians' },
      { status: 500 }
    );
  }
}
