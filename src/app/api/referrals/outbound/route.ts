import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { referrals } from '@/db/schema';
import { getUserPractice } from '@/lib/auth-utils';
import { canView } from '@/lib/rbac-helpers';
import { eq } from 'drizzle-orm';

// GET /api/referrals/outbound - Get outbound referrals
export async function GET(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Server-side RBAC: ensure the calling user can view referrals
    const callingUser = userPractice.user;
    if (!canView(callingUser as any, 'referrals')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get outbound referrals (sent from this practice)
    const outboundReferrals = await db.query.referrals.findMany({
      where: eq(referrals.referringPracticeId, Number(userPractice.practiceId)),
      with: {
        pet: true,
        referringVet: true,
        specialist: true,
        specialistPractice: true,
      },
      orderBy: (referrals, { desc }) => [desc(referrals.createdAt)],
    });

    return NextResponse.json(outboundReferrals);
  } catch (error) {
    console.error('Error fetching outbound referrals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch outbound referrals' },
      { status: 500 }
    );
  }
}
