import { NextResponse, NextRequest } from "next/server";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { practiceAddons } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-utils";

export async function POST(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const user = await getCurrentUser(request);
    
    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Unauthorized. Client access required.' }, { status: 401 });
    }

    const { items, billingCycle } = await request.json();
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ 
        error: 'No items provided for checkout' 
      }, { status: 400 });
    }

    console.log('Processing checkout for practice:', user.practiceId);
    console.log('Items:', items);

    // Create subscriptions for each item
    const subscriptions = [];
    
    for (const item of items) {
      try {
        const subscription = await (tenantDb as any).insert(practiceAddons).values({
          practiceId: user.practiceId,
          addonId: item.addonId,
          subscriptionTier: item.tier,
          billingCycle: billingCycle || 'monthly',
          paymentStatus: 'TRIAL', // Start with trial, can be updated to PAID after payment processing
          isActive: true,
        } as any).returning();

        subscriptions.push(subscription[0]);
      } catch (error) {
        console.error('Error creating subscription for addon:', item.addonId, error);
        // Continue with other items even if one fails
      }
    }

    console.log(`Created ${subscriptions.length} subscriptions`);

    // In a real app, you would integrate with a payment processor here
    // For now, we'll simulate successful payment
    
    return NextResponse.json({ 
      success: true,
      message: 'Checkout completed successfully',
      subscriptions,
      // Mock payment details
      payment: {
        id: 'pay_' + Math.random().toString(36).substr(2, 9),
        amount: items.reduce((total: number, item: any) => total + (item.addon.pricingTiers?.[item.tier]?.price || 0), 0),
        currency: 'USD',
        status: 'succeeded'
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error processing checkout:', error);
    return NextResponse.json({ 
      error: 'Failed to process checkout due to a server error. Please try again later.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
