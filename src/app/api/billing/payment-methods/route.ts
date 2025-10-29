import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice, getCurrentUser } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { paymentMethods } from '@/db/schema';
import { createAuditLog } from '@/lib/audit-logger';
import { eq, and, desc, ne } from 'drizzle-orm';
import { z } from 'zod';

// GET /api/billing/payment-methods - Get saved payment methods for current client
export async function GET(request: NextRequest) {
  try {
    // Get the tenant-specific database
    const tenantDb = await getCurrentTenantDb();
    
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only clients can view their own payment methods
    if (user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Access denied. Client access required.' }, { status: 403 });
    }

    console.log('[API /billing/payment-methods] Fetching payment methods for client:', user.id);

    const userPaymentMethods = await tenantDb.query.paymentMethods.findMany({
      where: and(
        eq(paymentMethods.clientId, user.id),
        eq(paymentMethods.isActive, 'yes')
      ),
      orderBy: [desc(paymentMethods.createdAt)],
    });

    console.log('[API /billing/payment-methods] Found payment methods:', userPaymentMethods.length);

    // Remove sensitive data before sending to client
    const sanitizedPaymentMethods = userPaymentMethods.map(pm => ({
      id: pm.id,
      type: pm.type,
      lastFourDigits: pm.lastFourDigits,
      expiryMonth: pm.expiryMonth,
      expiryYear: pm.expiryYear,
      cardBrand: pm.cardBrand,
      billingName: pm.billingName,
      billingAddress: pm.billingAddress,
      billingCity: pm.billingCity,
      billingState: pm.billingState,
      billingZip: pm.billingZip,
      billingCountry: pm.billingCountry,
      isDefault: pm.isDefault,
      createdAt: pm.createdAt,
    }));

    return NextResponse.json(sanitizedPaymentMethods);

  } catch (error) {
    console.error('[API /billing/payment-methods] Error fetching payment methods:', error);
    console.error('[API /billing/payment-methods] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to fetch payment methods', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/billing/payment-methods - Add new payment method
const createPaymentMethodSchema = z.object({
  type: z.enum(['credit_card', 'debit_card', 'bank_account', 'other']),
  cardNumber: z.string().min(13).max(19), // Will be tokenized in real implementation
  expiryMonth: z.string().optional(),
  expiryYear: z.string().optional(),
  cardBrand: z.string().optional(),
  billingName: z.string(),
  billingAddress: z.string().optional(),
  billingCity: z.string().optional(),
  billingState: z.string().optional(),
  billingZip: z.string().optional(),
  billingCountry: z.string().default('US'),
  isDefault: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only clients can add payment methods
    if (user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Access denied. Client access required.' }, { status: 403 });
    }

    const data = await request.json();
    const validationResult = createPaymentMethodSchema.safeParse(data);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const paymentMethodData = validationResult.data;

    // In a real implementation, you would:
    // 1. Tokenize the card with your payment processor (Stripe, etc.)
    // 2. Store only the token and metadata, never the full card number
    
    // For demo purposes, we'll just store the last 4 digits
    const lastFourDigits = paymentMethodData.cardNumber.slice(-4);
    
    // If this is set as default, unset other defaults first
    if (paymentMethodData.isDefault) {
      await tenantDb.update(paymentMethods)
        .set({ 
          isDefault: 'no',
          updatedAt: new Date()
        })
        .where(eq(paymentMethods.clientId, user.id));
    }

    // Create payment method record
    const [newPaymentMethod] = await tenantDb.insert(paymentMethods).values({
      clientId: user.id,
      type: paymentMethodData.type,
      lastFourDigits,
      expiryMonth: paymentMethodData.expiryMonth,
      expiryYear: paymentMethodData.expiryYear,
      cardBrand: paymentMethodData.cardBrand,
      billingName: paymentMethodData.billingName,
      billingAddress: paymentMethodData.billingAddress,
      billingCity: paymentMethodData.billingCity,
      billingState: paymentMethodData.billingState,
      billingZip: paymentMethodData.billingZip,
      billingCountry: paymentMethodData.billingCountry,
      isDefault: paymentMethodData.isDefault ? 'yes' : 'no',
      // In real implementation, store tokenized data:
      // stripePaymentMethodId: tokenizedPaymentMethod.id,
      // stripeCustomerId: customer.id,
    }).returning();

    // Create audit log
    await createAuditLog({
      userId: user.id.toString(),
      practiceId: user.practiceId!.toString(),
      action: 'CREATE',
      recordType: 'BILLING',
      recordId: newPaymentMethod.id.toString(),
      description: `Added payment method ending in ${lastFourDigits}`,
    });

    // Return sanitized data
    const sanitizedPaymentMethod = {
      id: newPaymentMethod.id,
      type: newPaymentMethod.type,
      lastFourDigits: newPaymentMethod.lastFourDigits,
      expiryMonth: newPaymentMethod.expiryMonth,
      expiryYear: newPaymentMethod.expiryYear,
      cardBrand: newPaymentMethod.cardBrand,
      billingName: newPaymentMethod.billingName,
      billingAddress: newPaymentMethod.billingAddress,
      billingCity: newPaymentMethod.billingCity,
      billingState: newPaymentMethod.billingState,
      billingZip: newPaymentMethod.billingZip,
      billingCountry: newPaymentMethod.billingCountry,
      isDefault: newPaymentMethod.isDefault,
      createdAt: newPaymentMethod.createdAt,
    };

    return NextResponse.json({
      ...sanitizedPaymentMethod,
      message: 'Payment method added successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('[API] Error adding payment method:', error);
    return NextResponse.json(
      { error: 'Failed to add payment method' },
      { status: 500 }
    );
  }
}

// DELETE /api/billing/payment-methods?id=<paymentMethodId> - Delete a payment method
export async function DELETE(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Access denied. Client access required.' }, { status: 403 });
    }

    const url = new URL(request.url);
    const paymentMethodId = url.searchParams.get('id');

    if (!paymentMethodId) {
      return NextResponse.json({ error: 'Payment method ID is required' }, { status: 400 });
    }

    // Check if payment method exists and belongs to user
    const paymentMethod = await tenantDb.query.paymentMethods.findFirst({
      where: and(
        eq(paymentMethods.id, parseInt(paymentMethodId)),
        eq(paymentMethods.clientId, user.id)
      )
    });

    if (!paymentMethod) {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 404 });
    }

    // Prevent deletion of primary payment method if it's the only one
    if (paymentMethod.isDefault === 'yes') {
      const otherMethods = await tenantDb.query.paymentMethods.findMany({
        where: and(
          eq(paymentMethods.clientId, user.id),
          eq(paymentMethods.isActive, 'yes'),
          ne(paymentMethods.id, parseInt(paymentMethodId))
        )
      });

      if (otherMethods.length === 0) {
        return NextResponse.json({ 
          error: 'Cannot delete the only payment method. Add another method before deleting this one.' 
        }, { status: 400 });
      }

      // If deleting primary method and others exist, set the first other method as primary
      if (otherMethods.length > 0) {
        await tenantDb.update(paymentMethods)
          .set({ 
            isDefault: 'yes',
            updatedAt: new Date()
          })
          .where(eq(paymentMethods.id, otherMethods[0].id));
      }
    }

    // Soft delete the payment method
    await tenantDb.update(paymentMethods)
      .set({ 
        isActive: 'no',
        updatedAt: new Date()
      })
      .where(eq(paymentMethods.id, parseInt(paymentMethodId)));

    // Create audit log
    await createAuditLog({
      userId: user.id.toString(),
      practiceId: user.practiceId!.toString(),
      action: 'DELETE',
      recordType: 'BILLING',
      recordId: paymentMethodId,
      description: `Deleted payment method ending in ${paymentMethod.lastFourDigits}`,
    });

    return NextResponse.json({ message: 'Payment method deleted successfully' });

  } catch (error) {
    console.error('[API] Error deleting payment method:', error);
    return NextResponse.json(
      { error: 'Failed to delete payment method' },
      { status: 500 }
    );
  }
}

// PATCH /api/billing/payment-methods?id=<paymentMethodId> - Set payment method as primary
export async function PATCH(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Access denied. Client access required.' }, { status: 403 });
    }

    const url = new URL(request.url);
    const paymentMethodId = url.searchParams.get('id');

    if (!paymentMethodId) {
      return NextResponse.json({ error: 'Payment method ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const updateSchema = z.object({
      isDefault: z.boolean(),
    });

    const updateData = updateSchema.parse(body);

    // Check if payment method exists and belongs to user
    const paymentMethod = await tenantDb.query.paymentMethods.findFirst({
      where: and(
        eq(paymentMethods.id, parseInt(paymentMethodId)),
        eq(paymentMethods.clientId, user.id),
        eq(paymentMethods.isActive, 'yes')
      )
    });

    if (!paymentMethod) {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 404 });
    }

    // If setting as default, unset other defaults first
    if (updateData.isDefault) {
      await tenantDb.update(paymentMethods)
        .set({ 
          isDefault: 'no',
          updatedAt: new Date()
        })
        .where(and(
          eq(paymentMethods.clientId, user.id),
          eq(paymentMethods.isActive, 'yes')
        ));
    }

    // Update the payment method
    await tenantDb.update(paymentMethods)
      .set({ 
        isDefault: updateData.isDefault ? 'yes' : 'no',
        updatedAt: new Date()
      })
      .where(eq(paymentMethods.id, parseInt(paymentMethodId)));

    // Create audit log
    await createAuditLog({
      userId: user.id.toString(),
      practiceId: user.practiceId!.toString(),
      action: 'UPDATE',
      recordType: 'BILLING',
      recordId: paymentMethodId,
      description: `${updateData.isDefault ? 'Set as primary' : 'Removed as primary'} payment method ending in ${paymentMethod.lastFourDigits}`,
    });

    return NextResponse.json({ message: 'Payment method updated successfully' });

  } catch (error) {
    console.error('[API] Error updating payment method:', error);
    return NextResponse.json(
      { error: 'Failed to update payment method' },
      { status: 500 }
    );
  }
}
