import { NextResponse } from "next/server";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { appointments } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request, context: { params: Promise<{ petId: string }> }) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const params = await context.params;
  const { petId } = params;

  console.log('Fetching appointments for Pet ID:', petId);

  try {
    // Query the database for appointments associated with the pet ID
    const appointmentsData = await tenantDb.query.appointments.findMany({
      where: (appointments, { eq }) => eq(appointments.petId, petId)
    });

    if (appointmentsData.length === 0) {
      console.log('No appointments found for Pet ID:', petId);
      return NextResponse.json({ error: 'No appointments found for this pet. Please ensure the pet ID is correct and data exists in the database.' }, { status: 404 });
    }

    return NextResponse.json(appointmentsData, { status: 200 });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json({ error: 'Failed to fetch appointments due to a server error. Please try again later.' }, { status: 500 });
  }
}
