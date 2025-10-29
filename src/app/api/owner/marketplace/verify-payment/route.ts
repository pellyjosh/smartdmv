// src/app/api/owner/marketplace/verify-payment/route.ts
// Verify marketplace payment after redirect from payment gateway
// This is for OWNER-level marketplace addon purchases

import { NextRequest, NextResponse } from 'next/server';
import { ownerDb } from '@/owner/db/config';
import { tenantBillingTransactions, ownerPaymentConfigurations } from '@/owner/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPaystackPayment } from '@/lib/payments/providers/paystack';
import { getTenantDb } from '@/tenant/db-manager';
import { practiceAddons } from '@/db/schema';
import crypto from 'crypto';

export const runtime = 'nodejs';

// Decryption function for owner payment keys
async function decryptApiKey(encryptedKey: string): Promise<string> {
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
 * GET /api/owner/marketplace/verify-payment?reference=xxx&transactionId=xxx&provider=paystack
 * 
 * Verifies marketplace payment and activates addon subscription
 * Used as callback URL after payment
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    // Paystack sends the reference as 'trxref' in the callback
    const paystackRef = searchParams.get('trxref') || searchParams.get('reference');
    const transactionId = searchParams.get('transactionId');
    const provider = searchParams.get('provider') || 'paystack';

    console.log('[OWNER PAYMENT VERIFY] Request:', {
      paystackRef,
      transactionId,
      provider,
      url: req.url,
    });

    if (!paystackRef || !transactionId) {
      return NextResponse.redirect(
        new URL('/marketplace?payment=error&message=Missing payment reference', req.url)
      );
    }

    // Get billing transaction from owner DB
    const [transaction] = await ownerDb
      .select()
      .from(tenantBillingTransactions)
      .where(eq(tenantBillingTransactions.id, parseInt(transactionId)))
      .limit(1);

    if (!transaction) {
      console.error('[OWNER PAYMENT VERIFY] Transaction not found:', transactionId);
      return NextResponse.redirect(
        new URL('/marketplace?payment=error&message=Transaction not found', req.url)
      );
    }

    // Check if already processed
    if (transaction.status === 'succeeded') {
      console.log('[OWNER PAYMENT VERIFY] Transaction already processed');
      return NextResponse.redirect(
        new URL('/marketplace?payment=success&message=Payment already completed', req.url)
      );
    }

    // Get payment configuration
    const [paymentConfig] = await ownerDb
      .select()
      .from(ownerPaymentConfigurations)
      .where(eq(ownerPaymentConfigurations.id, transaction.paymentConfigId))
      .limit(1);

    if (!paymentConfig?.secretKey) {
      console.error('[OWNER PAYMENT VERIFY] Payment config not found');
      return NextResponse.redirect(
        new URL('/marketplace?payment=error&message=Payment configuration error', req.url)
      );
    }

    // Decrypt secret key
    const secretKey = await decryptApiKey(paymentConfig.secretKey);

    // Verify payment with provider
    let verificationResult;
    
    if (provider === 'paystack') {
      verificationResult = await verifyPaystackPayment(paystackRef, secretKey);
    } else if (provider === 'stripe') {
      // Import Stripe verification
      const { verifyStripePayment } = await import('@/lib/payments/providers/stripe');
      verificationResult = await verifyStripePayment(paystackRef, secretKey);
    } else {
      return NextResponse.redirect(
        new URL('/marketplace?payment=error&message=Provider not supported', req.url)
      );
    }

    console.log('[OWNER PAYMENT VERIFY] Verification result:', {
      success: verificationResult.success,
      status: verificationResult.status,
      amount: verificationResult.amount,
    });

    if (!verificationResult.success || verificationResult.status !== 'success') {
      // Update transaction as failed
      await ownerDb
        .update(tenantBillingTransactions)
        .set({
          status: 'failed',
          failureCode: 'VERIFICATION_FAILED',
          failureMessage: verificationResult.error || 'Payment verification failed',
          updatedAt: new Date(),
        })
        .where(eq(tenantBillingTransactions.id, transaction.id));

      return NextResponse.redirect(
        new URL(
          `/marketplace?payment=failed&message=${encodeURIComponent(verificationResult.error || 'Payment verification failed')}`,
          req.url
        )
      );
    }

    // Payment verified successfully - update transaction
    const paymentDetails: any = verificationResult;
    await ownerDb
      .update(tenantBillingTransactions)
      .set({
        status: 'succeeded',
        providerResponse: verificationResult as any,
        paymentMethod: paymentDetails.channel || provider,
        paymentMethodDetails: {
          brand: paymentDetails.cardType,
          last4: paymentDetails.last4,
        },
        updatedAt: new Date(),
      })
      .where(eq(tenantBillingTransactions.id, transaction.id));

    console.log('[OWNER PAYMENT VERIFY] Transaction updated to succeeded');

    // Get tenant info to build proper redirect URL
    const { tenants } = await import('@/owner/db/schema');
    const [tenant] = await ownerDb
      .select()
      .from(tenants)
      .where(eq(tenants.id, transaction.tenantId))
      .limit(1);

    if (!tenant) {
      console.error('[OWNER PAYMENT VERIFY] Tenant not found:', transaction.tenantId);
      return NextResponse.redirect(
        new URL('/marketplace?payment=error&message=Tenant not found', req.url)
      );
    }

    // Activate addon subscription in tenant DB
    if (transaction.addonId && transaction.subscriptionId) {
      try {
        // Get tenant DB connection using tenant ID (convert to string)
        const tenantDb = await getTenantDb(transaction.tenantId.toString());
        
        await tenantDb
          .update(practiceAddons)
          .set({
            paymentStatus: 'ACTIVE',
            isActive: true,
            lastActivatedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(practiceAddons.id, transaction.subscriptionId));

        console.log('[OWNER PAYMENT VERIFY] Addon subscription activated:', transaction.subscriptionId);
      } catch (tenantError) {
        console.error('[OWNER PAYMENT VERIFY] Error activating subscription:', tenantError);
        // Don't fail the whole process, payment is already verified
      }
    }

    // Build proper redirect URL to tenant subdomain
    const host = req.headers.get('host') || 'localhost:9002';
    const protocol = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    
    // Build tenant subdomain URL
    let redirectHost = host;
    if (tenant.subdomain) {
      if (host.includes('localhost')) {
        // For localhost, prepend subdomain: innova.localhost:9002
        const [hostname, port] = host.split(':');
        redirectHost = port ? `${tenant.subdomain}.${hostname}:${port}` : `${tenant.subdomain}.${hostname}`;
      } else {
        // For production, replace first subdomain or prepend to domain
        const parts = host.split('.');
        if (parts.length > 2) {
          // Has subdomain, replace it
          parts[0] = tenant.subdomain;
          redirectHost = parts.join('.');
        } else {
          // No subdomain, add it
          redirectHost = `${tenant.subdomain}.${host}`;
        }
      }
    }
    
    const redirectUrl = `${protocol}://${redirectHost}/marketplace?payment=success&message=Payment completed successfully`;
    
    console.log('[OWNER PAYMENT VERIFY] Redirecting to:', redirectUrl);

    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('[OWNER PAYMENT VERIFY] Error:', error);
    
    const host = req.headers.get('host') || 'localhost:9002';
    const protocol = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const errorMessage = encodeURIComponent(error instanceof Error ? error.message : 'Verification failed');
    const redirectUrl = `${protocol}://${host}/marketplace?payment=error&message=${errorMessage}`;
    
    return NextResponse.redirect(redirectUrl);
  }
}
