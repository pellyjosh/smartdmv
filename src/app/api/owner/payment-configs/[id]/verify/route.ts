// src/app/api/owner/payment-configs/[id]/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ownerDb } from '@/owner/db/config';
import { ownerPaymentConfigurations, paymentProviders } from '@/owner/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// Encryption key from environment
const ENCRYPTION_KEY = process.env.PAYMENT_KEY_ENCRYPTION_SECRET || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-cbc';

// Utility: Decrypt sensitive data
function decrypt(text: string): string {
  const [ivHex, encryptedData] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// POST: Verify payment configuration by making a test API call
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = ownerDb;
    const configId = parseInt(params.id);

    // Get configuration
    const [config] = await db
      .select()
      .from(ownerPaymentConfigurations)
      .where(eq(ownerPaymentConfigurations.id, configId))
      .limit(1);

    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Payment configuration not found' },
        { status: 404 }
      );
    }

    // Get provider details
    const [provider] = await db
      .select()
      .from(paymentProviders)
      .where(eq(paymentProviders.id, config.providerId))
      .limit(1);

    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Payment provider not found' },
        { status: 404 }
      );
    }

    // Decrypt keys for verification
    const secretKey = decrypt(config.secretKey);
    const publicKey = config.publicKey ? decrypt(config.publicKey) : null;

    // Determine API base URL
    const baseUrl = config.environment === 'production' 
      ? provider.apiBaseUrl 
      : provider.sandboxApiBaseUrl;

    if (!baseUrl) {
      return NextResponse.json(
        { success: false, error: 'API base URL not configured for this provider' },
        { status: 400 }
      );
    }

    // Perform verification based on provider type
    let verificationResult: {
      success: boolean;
      message: string;
      details?: any;
    };

    try {
      switch (provider.code) {
        case 'stripe':
          verificationResult = await verifyStripe(baseUrl, secretKey);
          break;
        
        case 'paystack':
          verificationResult = await verifyPaystack(baseUrl, secretKey);
          break;
        
        case 'flutterwave':
          verificationResult = await verifyFlutterwave(baseUrl, secretKey);
          break;
        
        default:
          verificationResult = {
            success: false,
            message: `Verification not implemented for provider: ${provider.code}`,
          };
      }
    } catch (error: any) {
      verificationResult = {
        success: false,
        message: `Verification failed: ${error.message}`,
      };
    }

    // Update configuration if verification succeeded
    if (verificationResult.success) {
      await db
        .update(ownerPaymentConfigurations)
        .set({
          isVerified: true,
          lastVerifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(ownerPaymentConfigurations.id, configId));
    }

    return NextResponse.json({
      success: verificationResult.success,
      message: verificationResult.message,
      details: verificationResult.details,
      verifiedAt: verificationResult.success ? new Date() : null,
    });
  } catch (error) {
    console.error('Error verifying payment config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify payment configuration' },
      { status: 500 }
    );
  }
}

// Stripe verification
async function verifyStripe(baseUrl: string, secretKey: string) {
  try {
    const response = await fetch(`${baseUrl}/v1/balance`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: 'Stripe credentials verified successfully',
        details: {
          available: data.available,
          pending: data.pending,
        },
      };
    } else {
      const error = await response.json();
      return {
        success: false,
        message: `Stripe verification failed: ${error.error?.message || 'Invalid credentials'}`,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Stripe API error: ${error.message}`,
    };
  }
}

// Paystack verification
async function verifyPaystack(baseUrl: string, secretKey: string) {
  try {
    const response = await fetch(`${baseUrl}/balance`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: 'Paystack credentials verified successfully',
        details: {
          balance: data.data,
        },
      };
    } else {
      const error = await response.json();
      return {
        success: false,
        message: `Paystack verification failed: ${error.message || 'Invalid credentials'}`,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Paystack API error: ${error.message}`,
    };
  }
}

// Flutterwave verification
async function verifyFlutterwave(baseUrl: string, secretKey: string) {
  try {
    const response = await fetch(`${baseUrl}/v3/balances`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: 'Flutterwave credentials verified successfully',
        details: {
          balances: data.data,
        },
      };
    } else {
      const error = await response.json();
      return {
        success: false,
        message: `Flutterwave verification failed: ${error.message || 'Invalid credentials'}`,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Flutterwave API error: ${error.message}`,
    };
  }
}
