// src/app/api/owner/payment-configs/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ownerDb } from '@/owner/db/config';
import { ownerPaymentConfigurations, paymentProviders } from '@/owner/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// Encryption key from environment
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

// GET: Get single payment configuration with decrypted keys
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = ownerDb;
    const configId = parseInt(params.id);

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

    // Decrypt sensitive data for display (mask partially for security)
    const decryptedPublicKey = config.publicKey ? decrypt(config.publicKey) : null;
    const decryptedSecretKey = decrypt(config.secretKey);
    const decryptedWebhookSecret = config.webhookSecret ? decrypt(config.webhookSecret) : null;

    // Mask keys for security (show only last 4 characters)
    const maskKey = (key: string | null) => {
      if (!key) return null;
      const lastFour = key.slice(-4);
      return `${'*'.repeat(key.length - 4)}${lastFour}`;
    };

    return NextResponse.json({
      success: true,
      data: {
        ...config,
        publicKey: maskKey(decryptedPublicKey),
        secretKey: maskKey(decryptedSecretKey),
        webhookSecret: maskKey(decryptedWebhookSecret),
        provider: provider || null,
      },
    });
  } catch (error) {
    console.error('Error fetching payment config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment configuration' },
      { status: 500 }
    );
  }
}

// PATCH: Update payment configuration
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = ownerDb;
    const configId = parseInt(params.id);
    const body = await request.json();

    // Check if config exists
    const [existingConfig] = await db
      .select()
      .from(ownerPaymentConfigurations)
      .where(eq(ownerPaymentConfigurations.id, configId))
      .limit(1);

    if (!existingConfig) {
      return NextResponse.json(
        { success: false, error: 'Payment configuration not found' },
        { status: 404 }
      );
    }

    const {
      configName,
      publicKey,
      secretKey,
      webhookSecret,
      additionalConfig,
      environment,
      defaultCurrency,
      supportedCurrencies,
      isActive,
      isDefault,
      allowedForPlans,
      maxTenants,
      notes,
    } = body;

    // If marking as default, unset other defaults for the same provider
    if (isDefault && !existingConfig.isDefault) {
      await db
        .update(ownerPaymentConfigurations)
        .set({ isDefault: false })
        .where(eq(ownerPaymentConfigurations.providerId, existingConfig.providerId));
    }

    // Prepare update data (only encrypt if new keys provided)
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (configName !== undefined) updateData.configName = configName;
    if (publicKey !== undefined) updateData.publicKey = publicKey ? encrypt(publicKey) : null;
    if (secretKey !== undefined) updateData.secretKey = encrypt(secretKey);
    if (webhookSecret !== undefined) updateData.webhookSecret = webhookSecret ? encrypt(webhookSecret) : null;
    if (additionalConfig !== undefined) updateData.additionalConfig = additionalConfig;
    if (environment !== undefined) updateData.environment = environment;
    if (defaultCurrency !== undefined) updateData.defaultCurrency = defaultCurrency;
    if (supportedCurrencies !== undefined) updateData.supportedCurrencies = supportedCurrencies;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (allowedForPlans !== undefined) updateData.allowedForPlans = allowedForPlans;
    if (maxTenants !== undefined) updateData.maxTenants = maxTenants;
    if (notes !== undefined) updateData.notes = notes;

    // If keys changed, mark as unverified
    if (publicKey !== undefined || secretKey !== undefined || webhookSecret !== undefined) {
      updateData.isVerified = false;
      updateData.lastVerifiedAt = null;
    }

    // Update configuration
    const [updatedConfig] = await db
      .update(ownerPaymentConfigurations)
      .set(updateData)
      .where(eq(ownerPaymentConfigurations.id, configId))
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        id: updatedConfig.id,
        configName: updatedConfig.configName,
        environment: updatedConfig.environment,
        isActive: updatedConfig.isActive,
        isDefault: updatedConfig.isDefault,
        updatedAt: updatedConfig.updatedAt,
      },
      message: 'Payment configuration updated successfully',
    });
  } catch (error) {
    console.error('Error updating payment config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update payment configuration' },
      { status: 500 }
    );
  }
}

// DELETE: Delete payment configuration
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = ownerDb;
    const configId = parseInt(params.id);

    // Check if config exists
    const [existingConfig] = await db
      .select()
      .from(ownerPaymentConfigurations)
      .where(eq(ownerPaymentConfigurations.id, configId))
      .limit(1);

    if (!existingConfig) {
      return NextResponse.json(
        { success: false, error: 'Payment configuration not found' },
        { status: 404 }
      );
    }

    // Delete configuration
    await db
      .delete(ownerPaymentConfigurations)
      .where(eq(ownerPaymentConfigurations.id, configId));

    return NextResponse.json({
      success: true,
      message: 'Payment configuration deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting payment config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete payment configuration' },
      { status: 500 }
    );
  }
}
