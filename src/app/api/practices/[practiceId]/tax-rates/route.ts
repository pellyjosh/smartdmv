import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice, getCurrentUser } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { taxRates } from '@/db/schema';
import { hasPermission } from '@/lib/rbac-helpers';
import { createAuditLog } from '@/lib/audit-logger';
import { ResourceType, StandardAction } from '@/lib/rbac/types';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

// GET /api/practices/[practiceId]/tax-rates - Get tax rates for a practice
export async function GET(request: NextRequest, { params }: { params: Promise<{ practiceId: string }> }) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { practiceId: practiceIdString } = await params;
    const practiceId = parseInt(practiceIdString);
    
    // Verify user has access to this practice
    if (practiceId !== parseInt(userPractice.practiceId)) {
      return NextResponse.json({ error: 'Access denied to this practice' }, { status: 403 });
    }

    const tenantDb = await getCurrentTenantDb();
    
    const practicesTaxRates = await tenantDb.query.taxRates.findMany({
      where: and(
        eq(taxRates.practiceId, practiceId),
        eq(taxRates.active, 'yes')
      ),
      orderBy: [desc(taxRates.createdAt)],
    });

    return NextResponse.json(practicesTaxRates);
  } catch (error) {
    console.error('Error fetching tax rates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tax rates' },
      { status: 500 }
    );
  }
}

// POST /api/practices/[practiceId]/tax-rates - Create new tax rate
const createTaxRateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  rate: z.number().min(0, 'Rate must be positive'),
  type: z.enum(['percentage', 'fixed']),
  isDefault: z.boolean().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ practiceId: string }> }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { practiceId: practiceIdString } = await params;
    const practiceId = parseInt(practiceIdString);

    // Check if user has admin access or belongs to the practice
    const userPractice = await getUserPractice(request);
    if (!userPractice || parseInt(userPractice.practiceId) !== practiceId) {
      return NextResponse.json({ error: 'Access denied to this practice' }, { status: 403 });
    }

    // Allow access for admin roles
    const isAdmin = user.role === 'ADMINISTRATOR' || user.role === 'SUPER_ADMIN' || user.role === 'PRACTICE_ADMINISTRATOR';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied - admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createTaxRateSchema.parse(body);

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

    try {
      const now = new Date();
      const [newTaxRate] = await tenantDb.insert(taxRates).values({
        practiceId,
        name: validatedData.name,
        rate: (validatedData.rate as number).toString(),
        type: validatedData.type,
        isDefault: validatedData.isDefault ? 'yes' : 'no',
        createdAt: now,
        updatedAt: now,
      }).returning();

      // Log the action with better error handling
      try {
        await createAuditLog({
          action: 'CREATE',
          recordType: 'BILLING',
          recordId: newTaxRate.id.toString(),
          description: `Created tax rate: ${validatedData.name}`,
          userId: user.id.toString(),
          practiceId: practiceId.toString(),
        });
      } catch (auditError) {
        console.error('Error creating audit log for tax rate:', auditError);
        // Continue execution even if audit log fails
      }

      return NextResponse.json(newTaxRate, { status: 201 });
    } catch (dbError) {
      console.error('Database error creating tax rate:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('Error creating tax rate:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create tax rate' }, { status: 500 });
  }
}
