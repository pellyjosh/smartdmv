import { NextResponse, NextRequest } from "next/server";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { practiceAddons, addons, practices } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth-utils";
import { createMarketplacePayment } from '@/lib/payments/payment-handler';
import { ownerDb } from '@/owner/db/config';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ practiceId: string  }> }
) {
  const resolvedParams = await params;
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Authentication required.' }, { status: 401 });
    }

    const userRole = Array.isArray(user.role) ? user.role[0] : user.role;
    const allowedRoles = ['ADMINISTRATOR', 'PRACTICE_ADMIN', 'PRACTICE_ADMINISTRATOR', 'SUPER_ADMIN'];
    
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required to manage subscriptions.' }, { status: 401 });
    }

    const practiceId = parseInt(resolvedParams.practiceId);
    
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
    const addon = await tenantDb.query.addons.findFirst({
      where: eq(addons.id, addonId)
    });

    if (!addon) {
      return NextResponse.json({ error: 'Addon not found.' }, { status: 404 });
    }

    // Check if practice already has an active subscription to this addon
    const existingSubscription = await tenantDb.query.practiceAddons.findFirst({
      where: and(
        eq(practiceAddons.practiceId, practiceId),
        eq(practiceAddons.addonId, addonId),
        eq(practiceAddons.isActive, true)
      )
    });

    if (existingSubscription) {
      return NextResponse.json({ error: 'Practice already has an active subscription to this addon.' }, { status: 409 });
    }

    // Get practice details for billing
    const practice = await tenantDb.query.practices.findFirst({
      where: eq(practices.id, practiceId)
    });

    if (!practice) {
      return NextResponse.json({ error: 'Practice not found.' }, { status: 404 });
    }

    // Get company/tenant ID from current tenant context
    const { getCurrentTenant } = await import('@/lib/tenant-db-resolver');
    const tenantInfo = await getCurrentTenant();
    
    if (!tenantInfo) {
      return NextResponse.json({ error: 'Tenant information not found.' }, { status: 500 });
    }
    
    const tenantId = tenantInfo.id;
    console.log('[SUBSCRIBE] Using tenant ID:', tenantId, 'for practice:', practiceId);

    // Calculate addon price based on tier and billing cycle
    let addonPrice = 0;
    
    // Try to get price from pricing tiers first
    if (addon.pricingTiers && typeof addon.pricingTiers === 'object') {
      const tierPricing = (addon.pricingTiers as any)[tier];
      if (tierPricing) {
        // Use monthly or yearly price from tier
        addonPrice = billingCycle === 'yearly' 
          ? parseFloat(tierPricing.yearlyPrice || tierPricing.price || '0')
          : parseFloat(tierPricing.monthlyPrice || tierPricing.price || '0');
      }
    }
    
    // Fallback to legacy price field
    if (addonPrice === 0 && addon.price) {
      addonPrice = parseFloat(addon.price);
      
      // Apply tier multipliers for legacy pricing
      if (tier === 'PREMIUM') {
        addonPrice *= 1.5; // 50% more for premium
      } else if (tier === 'ENTERPRISE') {
        addonPrice *= 2; // Double for enterprise
      }
      
      // Apply yearly discount for legacy pricing
      if (billingCycle === 'yearly') {
        addonPrice *= 10; // 10 months worth (2 months free)
      }
    }

    console.log('[SUBSCRIBE] Calculated price:', {
      tier,
      billingCycle,
      addonPrice,
      hasPricingTiers: !!addon.pricingTiers,
      hasLegacyPrice: !!addon.price,
    });

    if (addonPrice === 0) {
      return NextResponse.json({ 
        error: 'Addon pricing not configured. Please contact support.',
      }, { status: 400 });
    }

    // Get practice currency (default to USD if not set)
    const practiceCurrency = await tenantDb.query.currencies.findFirst({
      where: (c: any, { eq }: any) => eq(c.id, practice.defaultCurrencyId),
    });
    const currency = (practiceCurrency as any)?.code || 'USD';

    // Get practice admin email for payment
    const practiceAdmin = await tenantDb.query.users.findFirst({
      where: (u: any, { eq, and }: any) => and(
        eq(u.practiceId, practiceId),
        eq(u.role, 'PRACTICE_ADMINISTRATOR')
      ),
    });

    const email = (practiceAdmin as any)?.email || user.email;

    // Process payment through owner's payment gateway
    const paymentResult = await createMarketplacePayment({
      tenantId,
      practiceId,
      amount: addonPrice,
      currency,
      email,
      description: `${addon.name} - ${tier} tier (${billingCycle})`,
      metadata: {
        practiceName: practice.name,
        addonSlug: addon.slug,
        tier,
        billingCycle,
      },
      addonId,
    });

    // If payment requires redirect (Paystack, etc), create PENDING subscription and return payment URL
    if (paymentResult.paymentUrl) {
      // Create pending subscription that will be activated after payment
      const currentDate = new Date();
      const newSubscription = await tenantDb.insert(practiceAddons).values({
        practiceId,
        addonId,
        subscriptionTier: tier,
        billingCycle,
        paymentStatus: 'PENDING',
        isActive: false,
        startDate: currentDate,
        lastActivatedAt: currentDate, // Set to current date for NOT NULL constraint
        createdAt: currentDate,
        updatedAt: currentDate
      }).returning();

      // Update transaction with subscription ID
      const { tenantBillingTransactions } = await import('@/owner/db/schema');
      await ownerDb
        .update(tenantBillingTransactions)
        .set({ subscriptionId: newSubscription[0].id })
        .where(eq(tenantBillingTransactions.id, paymentResult.transactionId!));

      console.log(`Created PENDING subscription ${newSubscription[0].id} for transaction ${paymentResult.transactionId}`);

      return NextResponse.json({
        success: true,
        requiresAction: true,
        paymentUrl: paymentResult.paymentUrl,
        message: 'Redirecting to payment gateway',
        transactionId: paymentResult.transactionId,
        reference: paymentResult.paymentId,
        subscriptionId: newSubscription[0].id,
      }, { status: 202 }); // 202 Accepted - Payment pending
    }

    // If payment failed completely, don't create subscription
    if (!paymentResult.success) {
      return NextResponse.json({
        error: 'Payment failed',
        message: paymentResult.error || 'Unable to process payment',
      }, { status: 402 }); // 402 Payment Required
    }

    // Payment succeeded immediately (e.g., Stripe with saved card) - create ACTIVE subscription
    const newSubscription = await tenantDb.insert(practiceAddons).values({
      practiceId,
      addonId,
      subscriptionTier: tier,
      billingCycle,
      paymentStatus: 'ACTIVE',
      isActive: true,
      startDate: new Date(),
      lastActivatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    console.log(`Created subscription for practice ${practiceId} to addon ${addonId} with payment transaction ${paymentResult.transactionId}`);

    return NextResponse.json({ 
      success: true,
      message: 'Successfully subscribed to addon',
      subscription: newSubscription[0],
      transaction: {
        id: paymentResult.transactionId,
        amount: addonPrice,
        currency,
      },
      paymentUrl: paymentResult.paymentUrl, // Include payment URL if customer needs to complete payment
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
  { params }: { params: Promise<{ practiceId: string  }> }
) {
  const resolvedParams = await params;
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Authentication required.' }, { status: 401 });
    }

    const userRole = Array.isArray(user.role) ? user.role[0] : user.role;
    const allowedRoles = ['ADMINISTRATOR', 'PRACTICE_ADMIN', 'PRACTICE_ADMINISTRATOR', 'SUPER_ADMIN'];
    
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required to manage subscriptions.' }, { status: 401 });
    }

    const practiceId = parseInt(resolvedParams.practiceId);
    
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
    const existingSubscription = await tenantDb.query.practiceAddons.findFirst({
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
    await tenantDb.update(practiceAddons)
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
