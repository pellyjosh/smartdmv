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
    if (practiceId !== parseInt(userPractice.practiceId)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    const tenantDb = await getCurrentTenantDb();

    const practice = await tenantDb.query.practices.findFirst({ where: (p: any, { eq }: any) => eq(p.id, practiceId) });
    const defaultCurrencyId = (practice as any)?.defaultCurrencyId;

    if (defaultCurrencyId) {
      const currency = await tenantDb.query.currencies.findFirst({ where: (c: any, { eq }: any) => eq(c.id, defaultCurrencyId) });
      if (currency) return NextResponse.json(currency);
    }

    // Fallback
    return NextResponse.json({ code: 'USD', name: 'US Dollar', symbol: '$', decimals: '2' });
  } catch (err) {
    console.error('Error fetching practice currency', err);
    return NextResponse.json({ code: 'USD', name: 'US Dollar', symbol: '$', decimals: '2' });
  }
}
