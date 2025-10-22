// src/app/api/practice-admin/payment-settings/route.ts
// Fetch and update practice payment gateway settings

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { practicePaymentProviders } from '@/db/schemas/paymentProvidersSchema';
import { eq, and } from 'drizzle-orm';
import { getUserPractice } from '@/lib/auth-utils';

export async function GET(req: NextRequest) {
  try {
    const userPractice = await getUserPractice(req);
    
    if (!userPractice) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const practiceId = parseInt(userPractice.practiceId);

    // Get the tenant-specific database
    const tenantDb = await getCurrentTenantDb();

    // Fetch all configured providers for this practice
    const configuredProviders = await tenantDb
      .select({
        id: practicePaymentProviders.id,
        providerCode: practicePaymentProviders.providerCode,
        providerName: practicePaymentProviders.providerName,
        isEnabled: practicePaymentProviders.isEnabled,
        isDefault: practicePaymentProviders.isDefault,
        environment: practicePaymentProviders.environment,
        priority: practicePaymentProviders.priority,
        lastTestedAt: practicePaymentProviders.lastTestedAt,
        lastUsedAt: practicePaymentProviders.lastUsedAt,
        totalTransactions: practicePaymentProviders.totalTransactions,
        totalAmount: practicePaymentProviders.totalAmount,
        // Don't return sensitive keys
        hasPublicKey: practicePaymentProviders.publicKey,
        hasSecretKey: practicePaymentProviders.secretKey,
        hasWebhookSecret: practicePaymentProviders.webhookSecret,
      })
      .from(practicePaymentProviders)
      .where(eq(practicePaymentProviders.practiceId, practiceId));

    // Find the default/preferred gateway
    const preferredGateway = configuredProviders.find((p: any) => p.isDefault)?.providerCode || null;

    return NextResponse.json({
      success: true,
      configuredProviders: configuredProviders.map((p: any) => ({
        ...p,
        hasPublicKey: !!p.hasPublicKey,
        hasSecretKey: !!p.hasSecretKey,
        hasWebhookSecret: !!p.hasWebhookSecret,
      })),
      preferredGateway,
    });
  } catch (error) {
    console.error('Error fetching payment settings:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch payment settings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
