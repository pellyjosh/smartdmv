// src/app/api/owner/payment-configs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ownerDb } from '@/owner/db/config';
import { ownerPaymentConfigurations, paymentProviders } from '@/owner/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';

// Encryption key from environment (32 bytes for AES-256)
const ENCRYPTION_KEY = process.env.PAYMENT_KEY_ENCRYPTION_SECRET || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-cbc';

// Utility: Encrypt sensitive data
function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

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

// GET: List all payment configurations
export async function GET(request: NextRequest) {
  try {
    const db = ownerDb;
    
    // Get search params
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('providerId');
    const isActive = searchParams.get('isActive');
    const environment = searchParams.get('environment');

    // Build query conditions
    const conditions = [];
    if (providerId) {
      conditions.push(eq(ownerPaymentConfigurations.providerId, parseInt(providerId)));
    }
    if (isActive !== null && isActive !== undefined) {
      conditions.push(eq(ownerPaymentConfigurations.isActive, isActive === 'true'));
    }
    if (environment) {
      conditions.push(eq(ownerPaymentConfigurations.environment, environment as 'production' | 'sandbox'));
    }

    // Fetch configurations
    const configs = await db
      .select({
        id: ownerPaymentConfigurations.id,
        providerId: ownerPaymentConfigurations.providerId,
        configName: ownerPaymentConfigurations.configName,
        environment: ownerPaymentConfigurations.environment,
        defaultCurrency: ownerPaymentConfigurations.defaultCurrency,
        supportedCurrencies: ownerPaymentConfigurations.supportedCurrencies,
        isActive: ownerPaymentConfigurations.isActive,
        isDefault: ownerPaymentConfigurations.isDefault,
        isVerified: ownerPaymentConfigurations.isVerified,
        lastVerifiedAt: ownerPaymentConfigurations.lastVerifiedAt,
        allowedForPlans: ownerPaymentConfigurations.allowedForPlans,
        maxTenants: ownerPaymentConfigurations.maxTenants,
        notes: ownerPaymentConfigurations.notes,
        createdAt: ownerPaymentConfigurations.createdAt,
        updatedAt: ownerPaymentConfigurations.updatedAt,
        // Join provider details
        provider: {
          id: paymentProviders.id,
          code: paymentProviders.code,
          name: paymentProviders.name,
          logoUrl: paymentProviders.logoUrl,
          supportedCurrencies: paymentProviders.supportedCurrencies,
          supportedPaymentMethods: paymentProviders.supportedPaymentMethods,
        },
      })
      .from(ownerPaymentConfigurations)
      .leftJoin(paymentProviders, eq(ownerPaymentConfigurations.providerId, paymentProviders.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(ownerPaymentConfigurations.createdAt));

    // Note: We don't return decrypted keys in list view for security
    return NextResponse.json({
      success: true,
      data: configs,
    });
  } catch (error) {
    console.error('Error fetching payment configs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment configurations' },
      { status: 500 }
    );
  }
}

// POST: Create new payment configuration
export async function POST(request: NextRequest) {
  try {
    const db = ownerDb;
    const body = await request.json();

    const {
      providerId,
      configName,
      publicKey,
      secretKey,
      webhookSecret,
      additionalConfig,
      environment = 'sandbox',
      defaultCurrency = 'USD',
      supportedCurrencies,
      isActive = true,
      isDefault = false,
      allowedForPlans,
      maxTenants,
      notes,
    } = body;

    // Validate required fields
    if (!providerId || !configName || !secretKey) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: providerId, configName, secretKey' },
        { status: 400 }
      );
    }

    // Verify provider exists
    const provider = await db
      .select()
      .from(paymentProviders)
      .where(eq(paymentProviders.id, providerId))
      .limit(1);

    if (!provider.length) {
      return NextResponse.json(
        { success: false, error: 'Payment provider not found' },
        { status: 404 }
      );
    }

    // If this is marked as default, unset other defaults for the same provider
    if (isDefault) {
      await db
        .update(ownerPaymentConfigurations)
        .set({ isDefault: false })
        .where(eq(ownerPaymentConfigurations.providerId, providerId));
    }

    // Encrypt sensitive data
    const encryptedPublicKey = publicKey ? encrypt(publicKey) : null;
    const encryptedSecretKey = encrypt(secretKey);
    const encryptedWebhookSecret = webhookSecret ? encrypt(webhookSecret) : null;

    // Create configuration
    const [newConfig] = await db
      .insert(ownerPaymentConfigurations)
      .values({
        providerId,
        configName,
        publicKey: encryptedPublicKey,
        secretKey: encryptedSecretKey,
        webhookSecret: encryptedWebhookSecret,
        additionalConfig,
        environment,
        defaultCurrency,
        supportedCurrencies,
        isActive,
        isDefault,
        isVerified: false, // Needs verification
        allowedForPlans,
        maxTenants,
        notes,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        id: newConfig.id,
        providerId: newConfig.providerId,
        configName: newConfig.configName,
        environment: newConfig.environment,
        defaultCurrency: newConfig.defaultCurrency,
        isActive: newConfig.isActive,
        isDefault: newConfig.isDefault,
        createdAt: newConfig.createdAt,
      },
      message: 'Payment configuration created successfully',
    });
  } catch (error) {
    console.error('Error creating payment config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create payment configuration' },
      { status: 500 }
    );
  }
}
