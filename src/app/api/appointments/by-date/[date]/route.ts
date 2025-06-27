// src/app/api/appointments/by-date/[date]/route.ts
import { NextResponse } from 'next/server';
import { eq, and, gte, lte } from 'drizzle-orm'; // Import gte and lte for range queries
import { schema } from '@/db/schema'; // Ensure this points to your combined schema (or specific appointments schema)
import { db } from '@/db'; // Your Drizzle DB instance

export async function GET(
  req: Request,
  { params }: { params: { date: string } }
) {
  try {
    // Await params to ensure it's fully resolved (as per Next.js warning)
    const resolvedParams = await params;
    const { date } = resolvedParams; // date from the URL path, e.g., "2025-06-18"
    
    const { searchParams } = new URL(req.url);
    const practiceId = searchParams.get('practiceId');

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    if (!practiceId) {
      return NextResponse.json({ error: 'Practice ID is required' }, { status: 400 });
    }

    // 1. Parse the date from the URL.
    // Ensure this date string from the URL is correctly formatted (e.g., "YYYY-MM-DD")
    // If your URL only provides "YYYY-MM-DD", new Date("YYYY-MM-DD") will parse it as midnight UTC.
    const requestedDate = new Date(date);

    if (isNaN(requestedDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    // 2. Define the start and end of the day in milliseconds for the range query.
    // It's crucial to correctly handle timezones. If your dates in the DB are
    // stored as UTC milliseconds, then you should compare with UTC times.
    // `setUTCHours` ensures we're dealing with UTC midnight/end-of-day.

    const startOfDay = new Date(requestedDate);
    startOfDay.setUTCHours(0, 0, 0, 0); // Midnight UTC of the requested day

    const endOfDay = new Date(requestedDate);
    endOfDay.setUTCHours(23, 59, 59, 999); // End of the day UTC (1 millisecond before next day)

    // Convert Date objects to milliseconds since epoch for binding
    const startOfDayMs = startOfDay.getTime();
    const endOfDayMs = endOfDay.getTime();

    // 3. Construct the query using the milliseconds values for comparison.
    const appointments = await db.select()
      .from(schema.appointments)
      .where(and(
        eq(schema.appointments.practiceId, practiceId),
        gte(schema.appointments.date, startOfDayMs), // Greater than or equal to start of day in MS
        lte(schema.appointments.date, endOfDayMs)    // Less than or equal to end of day in MS
      ));

    return NextResponse.json(appointments);

  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }
}