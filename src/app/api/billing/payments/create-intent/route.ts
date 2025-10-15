import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { invoices } from '@/db/schema';
import { getStripeClientForPractice } from '@/lib/payments/providers';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const tenantDb = await getCurrentTenantDb();
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await request.json();
    const { invoiceId, amount } = data;
    if (!invoiceId || !amount) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    const invoice = await tenantDb.query.invoices.findFirst({ where: and(eq(invoices.id, Number(invoiceId)), eq(invoices.clientId, user.id)) });
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    const stripe = await getStripeClientForPractice(user.practiceId!);
    if (!stripe) return NextResponse.json({ error: 'Stripe not configured for this practice' }, { status: 400 });

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(Number(amount) * 100),
      currency: (invoice.currencyId || 'USD').toString().toLowerCase(),
      metadata: { invoiceId: invoice.id.toString(), clientId: user.id.toString() },
    });

    return NextResponse.json({ id: intent.id, client_secret: intent.client_secret });
  } catch (err) {
    console.error('Error creating payment intent', err);
    return NextResponse.json({ error: 'Failed to create payment intent' }, { status: 500 });
  }
}
