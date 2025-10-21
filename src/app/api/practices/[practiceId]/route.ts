import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { practices, currencies } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { pgPool } from '@/db';

// GET /api/practices/[practiceId] - Get a specific practice
export async function GET(request: NextRequest, { params }: { params: Promise<{ practiceId: string }> }) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const practiceId = resolvedParams.practiceId;
    
    // For administrators and super admins, allow access to any practice for now
    // TODO: Implement proper practice access checking based on administrator_accessible_practices
    if (userPractice.user.role === 'ADMINISTRATOR' || userPractice.user.role === 'SUPER_ADMIN') {
      // Allow access - administrators can access any practice they're switching to
    } else {
      // For other roles, verify user has access to this specific practice
      if (practiceId !== userPractice.practiceId) {
        return NextResponse.json({ error: 'Access denied to this practice' }, { status: 403 });
      }
    }

    const practice = await tenantDb.query.practices.findFirst({
      where: eq(practices.id, parseInt(practiceId, 10)),
    });

    if (!practice) {
      return NextResponse.json({ error: 'Practice not found' }, { status: 404 });
    }

    // Resolve currency code if defaultCurrencyId is set
    let resolvedCurrency = null;
    try {
      if ((practice as any).defaultCurrencyId) {
        const currencyRow = await tenantDb.query.currencies.findFirst({
          where: (c: any, { eq: _eq }: any) => _eq(c.id, (practice as any).defaultCurrencyId),
        }).catch(() => null);
        if (currencyRow) {
          resolvedCurrency = {
            id: (currencyRow as any).id,
            code: (currencyRow as any).code,
            decimals: (currencyRow as any).decimals,
          };
        }
      }
    } catch (e) {
      // ignore currency resolution errors
      resolvedCurrency = null;
    }

    // Attach resolved currency if available
    const responsePayload = {
      ...practice,
      currency: resolvedCurrency,
    };

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('Error fetching practice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch practice' },
      { status: 500 }
    );
  }
}

  // PATCH /api/practices/[practiceId] - Update practice details
  export async function PATCH(request: NextRequest) {
    const tenantDb = await getCurrentTenantDb();

    const pathname = request.nextUrl.pathname;
    const practiceIdStr = pathname.split('/').pop();
    const practiceId = practiceIdStr ? parseInt(practiceIdStr, 10) : NaN;

    if (!Number.isFinite(practiceId)) {
      return NextResponse.json({ error: 'Invalid practice ID' }, { status: 400 });
    }

    try {
      const userPractice = await getUserPractice(request);
      if (!userPractice) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const body = await request.json();
      const schema = z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        country: z.string().optional(),
        isHeadOffice: z.boolean().optional(),
        defaultCurrencyId: z.number().optional(),
        defaultCurrencyCode: z.string().optional(),
        // Additional fields that might be sent from the form
        apiKey: z.string().optional(),
        webhookUrl: z.string().optional(),
        bookingWidgetEnabled: z.boolean().optional(),
        paymentEnabled: z.boolean().optional(),
      });

      const parsed = schema.parse(body);

      // Prevent non-admins from toggling the head office flag
      if (parsed.isHeadOffice !== undefined && !['ADMINISTRATOR', 'SUPER_ADMIN'].includes(userPractice.user.role)) {
        return NextResponse.json({ error: 'Insufficient permissions to change head office flag' }, { status: 403 });
      }

      const updateData: Record<string, any> = { ...parsed };

      // Remove system fields that should not be manually updated
      delete updateData.createdAt;
      delete updateData.updatedAt;

      // Ensure updatedAt is set to current timestamp for audit purposes
      updateData.updatedAt = new Date();

      console.log('Parsed data:', parsed);
      console.log('Update data before processing:', updateData);

      try {
        const [updated] = await tenantDb
          .update(practices)
          .set(updateData as any)
          .where(eq(practices.id, practiceId))
          .returning();

        if (!updated) {
          return NextResponse.json({ error: 'Practice not found' }, { status: 404 });
        }

        return NextResponse.json(updated, { status: 200 });
      } catch (drizzleErr: any) {
        console.error('Drizzle update failed:', drizzleErr);

        // Check if it's a column doesn't exist error
        if (drizzleErr.message && drizzleErr.message.includes('column') && drizzleErr.message.includes('does not exist')) {
          return NextResponse.json({
            error: 'Database schema mismatch. Please contact your administrator to update the database schema.',
            details: 'Some form fields are not yet supported in the current database version.'
          }, { status: 400 });
        }

        return NextResponse.json({ error: 'Failed to update practice' }, { status: 500 });
      }
    } catch (err) {
      console.error('Error in PATCH /api/practices/[id]:', err);
      return NextResponse.json({ error: 'Failed to update practice' }, { status: 500 });
    }
  }
