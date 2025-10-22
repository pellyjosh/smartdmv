// src/app/api/practice-admin/available-gateways/route.ts
// Fetch available payment gateways from Owner DB

import { NextRequest, NextResponse } from 'next/server';
import { ownerDb } from '@/owner/db/config';
import { paymentProviders } from '@/db/owner-schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    // Fetch all active payment providers from Owner DB
    const providers = await ownerDb
      .select({
        id: paymentProviders.id,
        code: paymentProviders.code,
        name: paymentProviders.name,
        description: paymentProviders.description,
        logoUrl: paymentProviders.logoUrl,
        websiteUrl: paymentProviders.websiteUrl,
        documentationUrl: paymentProviders.documentationUrl,
        supportedCurrencies: paymentProviders.supportedCurrencies,
        supportedPaymentMethods: paymentProviders.supportedPaymentMethods,
        supportedFeatures: paymentProviders.supportedFeatures,
        requiresPublicKey: paymentProviders.requiresPublicKey,
        requiresSecretKey: paymentProviders.requiresSecretKey,
        requiresWebhookSecret: paymentProviders.requiresWebhookSecret,
        configSchema: paymentProviders.configSchema,
        status: paymentProviders.status,
      })
      .from(paymentProviders)
      .where(eq(paymentProviders.status, 'active'))
      .orderBy(paymentProviders.priority);

    return NextResponse.json({
      success: true,
      providers,
    });
  } catch (error) {
    console.error('Error fetching available gateways:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch available payment gateways',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
