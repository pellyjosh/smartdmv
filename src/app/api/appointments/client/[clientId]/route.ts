import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { appointments } from '@/db/schema';
import { getUserPractice } from '@/lib/auth-utils';
import { eq, and } from 'drizzle-orm';

// GET /api/appointments/client/[clientId] - Get appointments for a specific client
export async function GET(request: NextRequest, { params }: { params: { clientId: string } }) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = parseInt(params.clientId);

    const clientAppointments = await db.query.appointments.findMany({
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
