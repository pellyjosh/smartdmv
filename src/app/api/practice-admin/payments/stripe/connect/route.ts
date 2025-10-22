// src/app/api/practice-admin/payments/stripe/connect/route.ts
// Save Stripe API keys for a practice

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { practicePaymentProviders } from '@/db/schemas/paymentProvidersSchema';
import { eq, and } from 'drizzle-orm';
import { getUserPractice } from '@/lib/auth-utils';
import { z } from 'zod';
import crypto from 'crypto';

const stripeConnectionSchema = z.object({
  publishableKey: z.string().min(1, 'Publishable key is required'),
  secretKey: z.string().min(1, 'Secret key is required'),
});

// Simple encryption for demo (use a proper encryption library in production)
function encryptKey(key: string): string {
  const algorithm = 'aes-256-cbc';
  const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32b';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(encryptionKey.padEnd(32, '0').slice(0, 32)), iv);
  let encrypted = cipher.update(key, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

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
    const validation = stripeConnectionSchema.safeParse(body);

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

    const { publishableKey, secretKey } = validation.data;

    // Get the tenant-specific database
    const tenantDb = await getCurrentTenantDb();

    // Check if configuration already exists
    const existing = await tenantDb
      .select()
      .from(practicePaymentProviders)
      .where(
        and(
          eq(practicePaymentProviders.practiceId, practiceId),
          eq(practicePaymentProviders.providerCode, 'stripe')
        )
      )
      .limit(1);

    // Encrypt the secret key
    const encryptedSecretKey = encryptKey(secretKey);

    if (existing.length > 0) {
      // Update existing configuration
      const result = await tenantDb
        .update(practicePaymentProviders)
        .set({
          publicKey: publishableKey,
          secretKey: encryptedSecretKey,
          isEnabled: true,
          updatedAt: new Date(),
        })
        .where(eq(practicePaymentProviders.id, existing[0].id))
        .returning();

      return NextResponse.json({
        success: true,
        message: 'Stripe configuration updated successfully',
        provider: result[0],
      });
    } else {
      // Create new configuration
      const result = await tenantDb
        .insert(practicePaymentProviders)
        .values({
          practiceId,
          providerCode: 'stripe',
          providerName: 'Stripe',
          publicKey: publishableKey,
          secretKey: encryptedSecretKey,
          isEnabled: true,
          environment: 'production',
          priority: '10',
          configuredBy: parseInt(userPractice.userId),
        })
        .returning();

      return NextResponse.json({
        success: true,
        message: 'Stripe configured successfully',
        provider: result[0],
      });
    }
  } catch (error) {
    console.error('Error connecting to Stripe:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to save Stripe configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
