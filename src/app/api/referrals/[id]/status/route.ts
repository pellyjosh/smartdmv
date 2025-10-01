import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { referrals, ReferralStatus } from '@/db/schema';
import { canEdit } from '@/lib/rbac-helpers';
import { eq } from 'drizzle-orm';

// Update status schema for validation
const updateStatusSchema = z.object({
  status: z.enum(Object.values(ReferralStatus) as [string, ...string[]]),
});

// PATCH /api/referrals/[id]/status - Update referral status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Server-side RBAC: ensure caller can update referrals
    if (!canEdit(userPractice.user as any, 'referrals')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: idParam } = await params;
    const body = await request.json();
    const { status } = updateStatusSchema.parse(body);
    const referralId = parseInt(idParam);

    if (isNaN(referralId)) {
      return NextResponse.json({ error: 'Invalid referral ID' }, { status: 400 });
    }

    // Update the referral status
    const [updatedReferral] = await tenantDb
      .update(referrals)
      .set({ 
        status,
        updatedAt: new Date(),
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
