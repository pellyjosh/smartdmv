import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, UserRoleEnum } from '@/db/schema';
import { getUserPractice } from '@/lib/auth-utils';
import { eq } from 'drizzle-orm';

// GET /api/veterinarians/specialists - Get specialist veterinarians
export async function GET(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all veterinarians (they can act as specialists)
    const specialists = await db.query.users.findMany({
      where: eq(users.role, UserRoleEnum.VETERINARIAN),
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      with: {
        practices: {
          with: {
            practice: true,
          },
        },
      },
    });

    return NextResponse.json(specialists);
  } catch (error) {
    console.error('Error fetching veterinarian specialists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch veterinarian specialists' },
      { status: 500 }
    );
  }
}
