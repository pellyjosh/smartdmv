import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { taxRates } from '@/db/schema';
import { hasPermission } from '@/lib/rbac-helpers';
import { createAuditLog } from '@/lib/audit-logger';
import { ResourceType, StandardAction } from '@/lib/rbac/types';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// PUT /api/practices/[practiceId]/tax-rates/[taxRateId] - Update tax rate
const updateTaxRateSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  rate: z.number().min(0, 'Rate must be positive').optional(),
  type: z.enum(['percentage', 'fixed']).optional(),
  isDefault: z.boolean().optional(),
  active: z.boolean().optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ practiceId: string, taxRateId: string }> }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { practiceId: practiceIdString, taxRateId: taxRateIdString } = await params;
    const practiceId = parseInt(practiceIdString);
    const taxRateId = parseInt(taxRateIdString);

    // Check if user has admin access or belongs to the practice
    const userPractice = await getUserPractice(request);
    if (!userPractice || parseInt(userPractice.practiceId.toString()) !== practiceId) {
      return NextResponse.json({ error: 'Access denied to this practice' }, { status: 403 });
    }

    // Allow access for admin roles
    const isAdmin = user.role === 'ADMINISTRATOR' || user.role === 'SUPER_ADMIN' || user.role === 'PRACTICE_ADMINISTRATOR';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied - admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateTaxRateSchema.parse(body);

    const tenantDb = await getCurrentTenantDb();

    // If setting as default, unset other defaults first
    if (validatedData.isDefault) {
      await tenantDb.update(taxRates)
        .set({ isDefault: 'no' })
        .where(and(
          eq(taxRates.practiceId, practiceId),
          eq(taxRates.isDefault, 'yes')
        ));
    }

    // Update the tax rate
    const updateData: any = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.rate !== undefined && validatedData.rate !== null) updateData.rate = validatedData.rate.toString();
    if (validatedData.type !== undefined) updateData.type = validatedData.type;
    if (validatedData.isDefault !== undefined) updateData.isDefault = validatedData.isDefault ? 'yes' : 'no';
    if (validatedData.active !== undefined) updateData.active = validatedData.active ? 'yes' : 'no';

    const [updatedTaxRate] = await tenantDb.update(taxRates)
      .set(updateData)
      .where(and(
        eq(taxRates.id, taxRateId),
        eq(taxRates.practiceId, practiceId)
      ))
      .returning();

    if (!updatedTaxRate) {
      return NextResponse.json({ error: 'Tax rate not found' }, { status: 404 });
    }

    // Log the action
    await createAuditLog({
      action: 'UPDATE',
      recordType: 'BILLING',
      recordId: taxRateId.toString(),
      description: `Updated tax rate: ${updatedTaxRate.name}`,
      userId: user.id.toString(),
      practiceId: practiceId.toString(),
    });

    return NextResponse.json(updatedTaxRate);
  } catch (error) {
    console.error('Error updating tax rate:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update tax rate' }, { status: 500 });
  }
}

// DELETE /api/practices/[practiceId]/tax-rates/[taxRateId] - Delete tax rate
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ practiceId: string, taxRateId: string }> }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { practiceId: practiceIdString, taxRateId: taxRateIdString } = await params;
    const practiceId = parseInt(practiceIdString);
    const taxRateId = parseInt(taxRateIdString);

    // Check if user has admin access or belongs to the practice
    const userPractice = await getUserPractice(request);
    if (!userPractice || parseInt(userPractice.practiceId.toString()) !== practiceId) {
      return NextResponse.json({ error: 'Access denied to this practice' }, { status: 403 });
    }

    // Allow access for admin roles
    const isAdmin = user.role === 'ADMINISTRATOR' || user.role === 'SUPER_ADMIN' || user.role === 'PRACTICE_ADMINISTRATOR';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied - admin access required' }, { status: 403 });
    }

    const tenantDb = await getCurrentTenantDb();

    // Soft delete by setting active to 'no'
    const [deletedTaxRate] = await tenantDb.update(taxRates)
      .set({ active: 'no' })
      .where(and(
        eq(taxRates.id, taxRateId),
        eq(taxRates.practiceId, practiceId)
      ))
      .returning();

    if (!deletedTaxRate) {
      return NextResponse.json({ error: 'Tax rate not found' }, { status: 404 });
    }

    // Log the action
    await createAuditLog({
      action: 'DELETE',
      recordType: 'BILLING',
      recordId: taxRateId.toString(),
      description: `Deleted tax rate: ${deletedTaxRate.name}`,
      userId: user.id.toString(),
      practiceId: practiceId.toString(),
    });

    return NextResponse.json({ message: 'Tax rate deleted successfully' });
  } catch (error) {
    console.error('Error deleting tax rate:', error);
    return NextResponse.json({ error: 'Failed to delete tax rate' }, { status: 500 });
  }
}