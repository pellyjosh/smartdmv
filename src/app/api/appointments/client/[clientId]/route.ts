import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { appointments } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/appointments/client/[clientId] - Get appointments for a specific client
export async function GET(request: NextRequest, { params }: { params: Promise<{ clientId: string  }> }) {
  const resolvedParams = await params;
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = parseInt(resolvedParams.clientId);

    const clientAppointments = await tenantDb.query.appointments.findMany({
      where: and(
        eq(appointments.clientId, clientId),
        eq(appointments.practiceId, parseInt(userPractice.practiceId))
      ),
      orderBy: (appointments, { desc }) => [desc(appointments.createdAt)]
    });

    return NextResponse.json(clientAppointments);
  } catch (error) {
    console.error('Error fetching client appointments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client appointments' },
      { status: 500 }
    );
  }
}
