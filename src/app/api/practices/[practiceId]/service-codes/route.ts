import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';

// GET /api/practices/[practiceId]/service-codes - Get service codes for a practice
export async function GET(request: NextRequest, { params }: { params: Promise<{ practiceId: string }> }) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { practiceId: practiceIdString } = await params;
    const practiceId = parseInt(practiceIdString);
    
    // Verify user has access to this practice
    if (practiceId !== parseInt(userPractice.practiceId)) {
      return NextResponse.json({ error: 'Access denied to this practice' }, { status: 403 });
    }

    // Return empty array for now - service codes schema needs to be created
    // TODO: Create service codes schema and implement DB queries
    return NextResponse.json([]);
  } catch (error) {
    console.error('Error fetching service codes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service codes' },
      { status: 500 }
    );
  }
}
