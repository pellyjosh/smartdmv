// src/app/api/practice-admin/payment-settings/preferred/route.ts
// Update practice's preferred payment gateway

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { practicePaymentProviders } from '@/db/schemas/paymentProvidersSchema';
import { eq, and } from 'drizzle-orm';
import { getUserPractice } from '@/lib/auth-utils';
import { z } from 'zod';

const preferredGatewaySchema = z.object({
  gatewayType: z.string().min(1, 'Gateway type is required'),
});

export async function POST(req: NextRequest) {
  try {
    const userPractice = await getUserPractice(req);
    
    if (!userPractice) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const practiceId = parseInt(userPractice.practiceId);

    const body = await req.json();
    const validation = preferredGatewaySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data',
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    const { gatewayType } = validation.data;

    // Get the tenant-specific database
    const tenantDb = await getCurrentTenantDb();

    // First, unset all providers as default for this practice
    await tenantDb
      .update(practicePaymentProviders)
      .set({ 
        isDefault: false,
        updatedAt: new Date(),
      })
      .where(eq(practicePaymentProviders.practiceId, practiceId));

    // Then set the selected gateway as default
    const result = await tenantDb
      .update(practicePaymentProviders)
      .set({ 
        isDefault: true, 
        isEnabled: true,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(practicePaymentProviders.practiceId, practiceId),
          eq(practicePaymentProviders.providerCode, gatewayType)
        )
      )
      .returning();

    if (!result || result.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Gateway not configured for this practice. Please configure API keys first.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${gatewayType} set as preferred payment gateway`,
      gateway: result[0],
    });
  } catch (error) {
    console.error('Error updating preferred gateway:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update preferred gateway',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
