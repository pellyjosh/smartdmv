import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice, getCurrentUser } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { payments, invoices } from '@/db/schema';
import { hasPermission } from '@/lib/rbac-helpers';
import { ResourceType, StandardAction } from '@/lib/rbac/types';
import { eq, and, desc } from 'drizzle-orm';

// GET /api/practices/[practiceId]/payments - Get payment history for practice (admin access)
export async function GET(request: NextRequest, { params }: { params: Promise<{ practiceId: string }> }) {
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

    // Allow access for admin roles or staff with billing permissions
    const isAdmin = user.role === 'ADMINISTRATOR' || user.role === 'SUPER_ADMIN' || user.role === 'PRACTICE_ADMINISTRATOR';
    const canView = isAdmin || await hasPermission(user, ResourceType.BILLING, StandardAction.READ);
    
    if (!canView) {
      return NextResponse.json({ error: 'Access denied - insufficient permissions' }, { status: 403 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    const tenantDb = await getCurrentTenantDb();

    let whereConditions: any[] = [];
    
    if (status) {
      whereConditions.push(eq(payments.status, status as any));
    }

    const practicePayments = await tenantDb.query.payments.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
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
                name: true,
                email: true,
              }
            },
            pet: {
              columns: {
                name: true,
              }
            }
          }
        }
      },
      orderBy: [desc(payments.paymentDate)],
    });

    return NextResponse.json(practicePayments);

  } catch (error) {
    console.error('[API] Error fetching practice payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}
