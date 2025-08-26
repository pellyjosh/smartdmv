import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db/index";
import { practiceAddons, addons } from "@/db/schema";
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
    const { addonId, tier = 'STANDARD', billingCycle = 'monthly' } = body;

    if (!addonId) {
      return NextResponse.json({ error: 'Addon ID is required.' }, { status: 400 });
    }

    // Check if addon exists
    const addon = await db.query.addons.findFirst({
      where: eq(addons.id, addonId)
    });

    if (!addon) {
      return NextResponse.json({ error: 'Addon not found.' }, { status: 404 });
    }

    // Check if practice already has an active subscription to this addon
    const existingSubscription = await db.query.practiceAddons.findFirst({
      where: and(
        eq(practiceAddons.practiceId, practiceId),
        eq(practiceAddons.addonId, addonId),
        eq(practiceAddons.isActive, true)
      )
    });

    if (existingSubscription) {
      return NextResponse.json({ error: 'Practice already has an active subscription to this addon.' }, { status: 409 });
    }

    // Create new subscription (without payment processing for now)
    const newSubscription = await db.insert(practiceAddons).values({
      practiceId,
      addonId,
      subscriptionTier: tier,
      billingCycle,
      paymentStatus: 'ACTIVE', // Set as active since we're bypassing payment for now
      isActive: true,
      startDate: new Date(),
      lastActivatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    console.log(`Created subscription for practice ${practiceId} to addon ${addonId}`);

    return NextResponse.json({ 
      message: 'Successfully subscribed to addon',
      subscription: newSubscription[0]
    }, { status: 201 });

  } catch (error) {
    console.error('Error subscribing to addon:', error);
    return NextResponse.json({ 
      error: 'Failed to subscribe to addon due to a server error. Please try again later.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE endpoint to cancel/unsubscribe from an addon
export async function DELETE(
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
      userPracticeId = (user as any).currentPracticeId;
    } else {
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

    // Find and deactivate the subscription
    const existingSubscription = await db.query.practiceAddons.findFirst({
      where: and(
        eq(practiceAddons.practiceId, practiceId),
        eq(practiceAddons.addonId, addonId),
        eq(practiceAddons.isActive, true)
      )
    });

    if (!existingSubscription) {
      return NextResponse.json({ error: 'No active subscription found for this addon.' }, { status: 404 });
    }

    // Deactivate the subscription
    await db.update(practiceAddons)
      .set({
        isActive: false,
        paymentStatus: 'CANCELLED',
        updatedAt: new Date()
      })
      .where(eq(practiceAddons.id, existingSubscription.id));

    console.log(`Cancelled subscription for practice ${practiceId} to addon ${addonId}`);

    return NextResponse.json({ 
      message: 'Successfully cancelled subscription'
    }, { status: 200 });

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json({ 
      error: 'Failed to cancel subscription due to a server error. Please try again later.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
