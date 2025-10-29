// src/app/api/practice-admin/available-gateways/route.ts
// Fetch available payment gateways from Owner DB filtered by practice currency

import { NextRequest, NextResponse } from 'next/server';
import { ownerDb } from '@/owner/db/config';
import { paymentProviders, providerCurrencySupport } from '@/owner/db/schemas/ownerSchema';
import { eq, and } from 'drizzle-orm';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';

export async function GET(req: NextRequest) {
  try {
    // Get user's practice
    const userPractice = await getUserPractice(req);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const practiceId = parseInt(userPractice.practiceId);
    const tenantDb = await getCurrentTenantDb();

    // Get practice currency
    const practice = await tenantDb.query.practices.findFirst({
      where: (p: any, { eq }: any) => eq(p.id, practiceId),
    });

    const defaultCurrencyId = (practice as any)?.defaultCurrencyId;

    if (!defaultCurrencyId) {
      return NextResponse.json({
        success: false,
        error: 'No currency configured for this practice. Please configure a default currency first.',
        providers: [],
      }, { status: 400 });
    }

    // Get currency code
    const currency = await tenantDb.query.currencies.findFirst({
      where: (c: any, { eq }: any) => eq(c.id, defaultCurrencyId),
    });

    if (!currency) {
      return NextResponse.json({
        success: false,
        error: 'Currency not found',
        providers: [],
      }, { status: 404 });
    }

    const currencyCode = (currency as any).code;

    // Fetch payment providers that support this currency
    const currencySupport = await ownerDb
      .select({
        providerId: providerCurrencySupport.providerId,
        currencyCode: providerCurrencySupport.currencyCode,
        isRecommended: providerCurrencySupport.isRecommended,
        transactionFeePercent: providerCurrencySupport.transactionFeePercent,
        transactionFeeFixed: providerCurrencySupport.transactionFeeFixed,
      })
      .from(providerCurrencySupport)
      .where(
        and(
          eq(providerCurrencySupport.currencyCode, currencyCode),
          eq(providerCurrencySupport.isActive, true)
        )
      );

    const supportedProviderIds = currencySupport.map(cs => cs.providerId);

    if (supportedProviderIds.length === 0) {
      return NextResponse.json({
        success: true,
        providers: [],
        message: `No payment providers support ${currencyCode} currency.`,
        currencyCode,
      });
    }

    // Fetch provider details for supported providers
    const providers = await ownerDb.query.paymentProviders.findMany({
      where: (p: any, { and, eq, inArray }: any) => 
        and(
          eq(p.status, 'active'),
          inArray(p.id, supportedProviderIds)
        ),
    });

    // Enhance providers with currency-specific info
    const enhancedProviders = providers.map(provider => {
      const currencyInfo = currencySupport.find(cs => cs.providerId === provider.id);
      return {
        ...provider,
        currencySupport: currencyInfo,
      };
    });

    // Sort by recommended first, then by priority
    enhancedProviders.sort((a, b) => {
      if (a.currencySupport?.isRecommended && !b.currencySupport?.isRecommended) return -1;
      if (!a.currencySupport?.isRecommended && b.currencySupport?.isRecommended) return 1;
      return (b.priority || 0) - (a.priority || 0);
    });

    return NextResponse.json({
      success: true,
      providers: enhancedProviders,
      currencyCode,
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
