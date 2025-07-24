import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { practices } from '@/db/schema';
import { getUserPractice } from '@/lib/auth-utils';
import { eq } from 'drizzle-orm';

// GET /api/practices - Get practices accessible to current user
export async function GET(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all practices for referral purposes
    const allPractices = await db.query.practices.findMany({
      columns: {
        id: true,
        name: true,
        email: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        phone: true,
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
