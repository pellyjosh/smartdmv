import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { practices } from '@/db/schemas/practicesSchema';
import { currencies } from '@/db/schemas/currencySchema';
import { and, eq } from 'drizzle-orm';

// GET /api/practices/[practiceId]/currency
export async function GET(request: NextRequest, context: { params: Promise<{ practiceId: string }> | { practiceId: string } }) {
  try {
    const resolvedParams = await context.params as { practiceId: string };
    const userPractice = await getUserPractice(request);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const practiceId = Number(resolvedParams.practiceId);
    
    // Allow CLIENT role to access any practice currency (for viewing invoices)
    // For other roles, enforce practice ID match
    if (userPractice.userRole !== 'CLIENT' && practiceId !== parseInt(userPractice.practiceId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const tenantDb = await getCurrentTenantDb();

    const practice = await tenantDb.query.practices.findFirst({ where: (p: any, { eq }: any) => eq(p.id, practiceId) });
    const defaultCurrencyId = (practice as any)?.defaultCurrencyId;

    console.log('[CURRENCY API] Practice:', practice);
    console.log('[CURRENCY API] defaultCurrencyId:', defaultCurrencyId);

    if (!defaultCurrencyId) {
      return NextResponse.json({ error: 'No currency configured for this practice' }, { status: 404 });
    }

    const currency = await tenantDb.query.currencies.findFirst({ where: (c: any, { eq }: any) => eq(c.id, defaultCurrencyId) });
    
    console.log('[CURRENCY API] Currency found:', currency);
    
    if (!currency) {
      return NextResponse.json({ error: 'Currency not found' }, { status: 404 });
    }

    return NextResponse.json(currency);
  } catch (err) {
    console.error('Error fetching practice currency', err);
    return NextResponse.json({ error: 'Failed to fetch currency' }, { status: 500 });
  }
}
