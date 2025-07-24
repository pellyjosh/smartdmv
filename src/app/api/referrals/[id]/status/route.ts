import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { referrals, ReferralStatus } from '@/db/schema';
import { getUserPractice } from '@/lib/auth-utils';
import { eq } from 'drizzle-orm';

// Update status schema for validation
const updateStatusSchema = z.object({
  status: z.enum(Object.values(ReferralStatus) as [string, ...string[]]),
});

// PATCH /api/referrals/[id]/status - Update referral status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status } = updateStatusSchema.parse(body);
    const referralId = parseInt(params.id);

    if (isNaN(referralId)) {
      return NextResponse.json({ error: 'Invalid referral ID' }, { status: 400 });
    }

    // Update the referral status
    const [updatedReferral] = await db
      .update(referrals)
      .set({ 
        status,
        updatedAt: new Date().toISOString(),
        // If marking as completed, set completed date
        ...(status === ReferralStatus.COMPLETED && { completedDate: new Date().toISOString() })
      })
      .where(eq(referrals.id, referralId))
      .returning();

    if (!updatedReferral) {
      return NextResponse.json({ error: 'Referral not found' }, { status: 404 });
    }

    return NextResponse.json(updatedReferral);
  } catch (error) {
    console.error('Error updating referral status:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update referral status' },
      { status: 500 }
    );
  }
}
