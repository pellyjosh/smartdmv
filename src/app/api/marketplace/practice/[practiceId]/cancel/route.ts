import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db/index";
import { practiceAddons } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth-utils";

export async function POST(
  request: NextRequest,
  { params }: { params: { practiceId: string } }
) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Authentication required.' }, { status: 401 });
    }

    const userRole = Array.isArray(user.role) ? user.role[0] : user.role;
    const allowedRoles = ['ADMINISTRATOR', 'PRACTICE_ADMIN', 'PRACTICE_ADMINISTRATOR'];
    
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required to manage subscriptions.' }, { status: 401 });
    }

    const practiceId = parseInt(params.practiceId);
    
    if (!practiceId || isNaN(practiceId)) {
      return NextResponse.json({ error: 'Invalid practice ID.' }, { status: 400 });
    }

    // Get the user's practice ID based on their role
    let userPracticeId: number;
    
    if (userRole === 'ADMINISTRATOR' || userRole === 'SUPER_ADMIN') {
      // Admin users can manage any practice they have access to
      userPracticeId = (user as any).currentPracticeId;
    } else {
      // Regular practice users
      userPracticeId = (user as any).practiceId;
    }
    
    // Verify user has access to this practice
    if (userPracticeId !== practiceId) {
      return NextResponse.json({ error: 'Access denied. You can only manage subscriptions for your practice.' }, { status: 403 });
    }

    const body = await request.json();
    const { addonId } = body;

    if (!addonId) {
      return NextResponse.json({ error: 'Addon ID is required.' }, { status: 400 });
    }

    // Find the active subscription
    const subscription = await db.query.practiceAddons.findFirst({
      where: and(
        eq(practiceAddons.practiceId, practiceId),
        eq(practiceAddons.addonId, addonId),
        eq(practiceAddons.isActive, true)
      )
    });

    if (!subscription) {
      return NextResponse.json({ error: 'No active subscription found for this addon.' }, { status: 404 });
    }

    // Cancel the subscription by setting isActive to false and updating status
    await db.update(practiceAddons)
      .set({
        isActive: false,
        paymentStatus: 'CANCELLED',
        endDate: new Date(),
        updatedAt: new Date()
      })
      .where(eq(practiceAddons.id, subscription.id));

    console.log(`Cancelled subscription ${subscription.id} for practice ${practiceId} to addon ${addonId}`);

    return NextResponse.json({ 
      message: 'Successfully cancelled addon subscription'
    }, { status: 200 });

  } catch (error) {
    console.error('Error cancelling addon subscription:', error);
    return NextResponse.json({ 
      error: 'Failed to cancel addon subscription due to a server error. Please try again later.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
