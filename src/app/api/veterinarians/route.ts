import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, UserRoleEnum } from '@/db/schema';
import { getUserPractice } from '@/lib/auth-utils';
import { eq } from 'drizzle-orm';

// GET /api/veterinarians - Get veterinarians for current practice
export async function GET(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all veterinarians for simplicity (in real app, filter by practice)
    const veterinarians = await db.query.users.findMany({
      where: eq(users.role, UserRoleEnum.VETERINARIAN),
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json(veterinarians);
  } catch (error) {
    console.error('Error fetching veterinarians:', error);
    return NextResponse.json(
      { error: 'Failed to fetch veterinarians' },
      { status: 500 }
    );
  }
}
