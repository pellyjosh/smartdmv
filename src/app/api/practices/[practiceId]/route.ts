import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { practices } from '@/db/schema';
import { getUserPractice } from '@/lib/auth-utils';
import { eq } from 'drizzle-orm';

// GET /api/practices/[practiceId] - Get a specific practice
export async function GET(request: NextRequest, { params }: { params: Promise<{ practiceId: string }> }) {
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

    const practice = await db.query.practices.findFirst({
      where: eq(practices.id, parseInt(practiceId, 10)),
    });

    if (!practice) {
      return NextResponse.json({ error: 'Practice not found' }, { status: 404 });
    }

    return NextResponse.json(practice);
  } catch (error) {
    console.error('Error fetching practice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch practice' },
      { status: 500 }
    );
  }
}
