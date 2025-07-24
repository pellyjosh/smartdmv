import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { referrals } from '@/db/schema';
import { getUserPractice } from '@/lib/auth-utils';
import { eq } from 'drizzle-orm';

// GET /api/referrals/inbound - Get inbound referrals
export async function GET(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get inbound referrals (sent to this practice)
    const inboundReferrals = await db.query.referrals.findMany({
      where: eq(referrals.specialistPracticeId, userPractice.practiceId),
      with: {
        pet: true,
        referringVet: true,
        referringPractice: true,
        specialist: true,
      },
      orderBy: (referrals, { desc }) => [desc(referrals.createdAt)],
    });

    return NextResponse.json(inboundReferrals);
  } catch (error) {
    console.error('Error fetching inbound referrals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inbound referrals' },
      { status: 500 }
    );
  }
}
