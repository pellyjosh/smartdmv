import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice, getCurrentUser } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { payments } from '@/db/schema';
import { hasPermission } from '@/lib/rbac-helpers';
import { ResourceType, StandardAction } from '@/lib/rbac/types';
import { eq, and, desc, inArray, or } from 'drizzle-orm';

// GET /api/practices/[practiceId]/payments/eligible-for-refund
// Returns payments with status 'completed' or 'processing' that can be refunded
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ practiceId: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { practiceId: practiceIdString } = await params;
    const practiceId = parseInt(practiceIdString);

    // Check if user has access to the practice
    const userPractice = await getUserPractice(request);
    if (!userPractice || parseInt(userPractice.practiceId) !== practiceId) {
      return NextResponse.json(
        { error: 'Access denied to this practice' },
        { status: 403 }
      );
    }

    // Check permissions for billing/refunds
    const isAdmin =
      user.role === 'ADMINISTRATOR' ||
      user.role === 'SUPER_ADMIN' ||
      user.role === 'PRACTICE_ADMINISTRATOR';
    const canView =
      isAdmin || (await hasPermission(user, ResourceType.BILLING, StandardAction.READ));

    if (!canView) {
      return NextResponse.json(
        { error: 'Access denied - insufficient permissions' },
        { status: 403 }
      );
    }

    const tenantDb = await getCurrentTenantDb();

    // Fetch payments with status 'completed' or 'processing'
    const eligiblePayments = await tenantDb.query.payments.findMany({
      where: or(
        eq(payments.status, 'completed'),
        eq(payments.status, 'processing')
      ),
      with: {
        invoice: {
          columns: {
            invoiceNumber: true,
            description: true,
            totalAmount: true,
          },
          with: {
            client: {
              columns: {
                id: true,
                name: true,
                email: true,
              },
            },
            pet: {
              columns: {
                name: true,
              },
            },
          },
        },
        client: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        currency: {
          columns: {
            id: true,
            code: true,
            symbol: true,
          },
        },
      },
      orderBy: [desc(payments.paymentDate)],
    });

    // Transform the data for easier consumption in the frontend
    const formattedPayments = eligiblePayments.map((payment: any) => ({
      id: payment.id,
      paymentNumber: payment.paymentNumber,
      transactionId: payment.transactionId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      paymentDate: payment.paymentDate,
      client: payment.client || payment.invoice?.client,
      invoice: payment.invoice
        ? {
            invoiceNumber: payment.invoice.invoiceNumber,
            description: payment.invoice.description,
            totalAmount: payment.invoice.totalAmount,
            pet: payment.invoice.pet,
          }
        : null,
    }));

    return NextResponse.json(formattedPayments);
  } catch (error) {
    console.error('[API] Error fetching eligible payments for refund:', error);
    return NextResponse.json(
      { error: 'Failed to fetch eligible payments' },
      { status: 500 }
    );
  }
}
