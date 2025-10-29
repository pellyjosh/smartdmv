// src/app/api/payments/verify/route.ts
// Verify payment after redirect from payment gateway

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { invoices, payments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPaystackPayment } from '@/lib/payments/providers/paystack';
import { practicePaymentProviders } from '@/db/schemas/paymentProvidersSchema';

export const runtime = 'nodejs';

// Decryption function (same as in payment-handler)
async function decryptApiKey(encryptedKey: string): Promise<string> {
  const crypto = require('crypto');
  const ENCRYPTION_KEY = process.env.APP_KEY;
  if (!ENCRYPTION_KEY) {
    throw new Error('APP_KEY not configured');
  }
  
  const parts = encryptedKey.split(':');
  const iv = Buffer.from(parts.shift()!, 'hex');
  const encryptedText = Buffer.from(parts.join(':'), 'hex');
  const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

/**
 * GET /api/payments/verify?reference=xxx&provider=paystack
 * 
 * Verifies payment status and updates invoice
 * Used as callback URL after payment
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const reference = searchParams.get('reference');
    const provider = searchParams.get('provider') || 'paystack';
    const invoiceId = searchParams.get('invoiceId');

    console.log('[PAYMENT VERIFY] Request URL:', req.url);
    console.log('[PAYMENT VERIFY] Request host:', req.headers.get('host'));

    if (!reference) {
      return NextResponse.redirect(
        new URL('/client/billing?payment=error&message=No reference provided', req.url)
      );
    }

    console.log('[PAYMENT VERIFY] Verifying payment:', {
      reference,
      provider,
      invoiceId,
    });

    const db = await getCurrentTenantDb();

    // Get provider credentials
    const [practiceProvider] = await db
      .select()
      .from(practicePaymentProviders)
      .where(eq(practicePaymentProviders.providerCode, provider))
      .limit(1);

    if (!practiceProvider?.secretKey) {
      console.error('[PAYMENT VERIFY] Provider not configured');
      return NextResponse.redirect(
        new URL('/client/billing?payment=error&message=Provider not configured', req.url)
      );
    }

    // Decrypt secret key
    const secretKey = await decryptApiKey(practiceProvider.secretKey);

    // Verify payment with provider
    let verificationResult;
    
    if (provider === 'paystack') {
      verificationResult = await verifyPaystackPayment(reference, secretKey);
    } else {
      return NextResponse.redirect(
        new URL('/client/billing?payment=error&message=Provider not supported', req.url)
      );
    }

    console.log('[PAYMENT VERIFY] Verification result:', verificationResult);

    if (!verificationResult.success) {
      return NextResponse.redirect(
        new URL(
          `/client/billing?payment=failed&message=${encodeURIComponent(verificationResult.error || 'Payment verification failed')}`,
          req.url
        )
      );
    }

    // If invoice ID provided, update invoice
    if (invoiceId) {
      const invoice = await db.query.invoices.findFirst({
        where: (inv: any, { eq }: any) => eq(inv.id, parseInt(invoiceId)),
      });

      if (invoice && invoice.status !== 'paid') {
        // Update invoice status
        await db
          .update(invoices)
          .set({
            status: 'paid',
            paidAt: new Date(verificationResult.paidAt || new Date()),
            updatedAt: new Date(),
          })
          .where(eq(invoices.id, parseInt(invoiceId)));

        console.log('[PAYMENT VERIFY] Invoice marked as paid:', invoiceId);

        // Record payment with all required fields from invoice
        const paymentNumber = `PAY-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
        
        try {
          await db.insert(payments).values({
            practiceId: (invoice as any).practiceId, // Required: practice from invoice
            invoiceId: parseInt(invoiceId),
            clientId: (invoice as any).clientId, // Required: client from invoice
            paymentNumber,
            amount: verificationResult.amount?.toString() || '0',
            currencyId: (invoice as any).currencyId, // Currency from invoice (required)
            paymentMethod: provider,
            paymentDate: new Date(verificationResult.paidAt || new Date()),
            status: 'completed',
            transactionId: reference,
            notes: `${provider} payment - ${verificationResult.channel || 'online'} - ${verificationResult.currency || ''}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          console.log('[PAYMENT VERIFY] Payment recorded successfully:', paymentNumber);
        } catch (paymentError) {
          console.error('[PAYMENT VERIFY] Error recording payment:', paymentError);
          console.error('[PAYMENT VERIFY] Payment data:', {
            practiceId: (invoice as any).practiceId,
            invoiceId: parseInt(invoiceId),
            clientId: (invoice as any).clientId,
            amount: verificationResult.amount?.toString(),
          });
        }
      }
    }

    // Build proper redirect URL using the host header (which has the tenant subdomain)
    const host = req.headers.get('host') || 'localhost:9002';
    const protocol = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const redirectUrl = `${protocol}://${host}/client/billing?payment=success&message=Payment completed successfully`;
    
    console.log('[PAYMENT VERIFY] Redirecting to:', redirectUrl);

    // Redirect to billing page with success
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('[PAYMENT VERIFY] Error:', error);
    
    // Build proper redirect URL for error case too
    const host = req.headers.get('host') || 'localhost:9002';
    const protocol = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const errorMessage = encodeURIComponent(error instanceof Error ? error.message : 'Verification failed');
    const redirectUrl = `${protocol}://${host}/client/billing?payment=error&message=${errorMessage}`;
    
    return NextResponse.redirect(redirectUrl);
  }
}
