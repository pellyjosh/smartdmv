// src/app/api/widget/availability/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { appointments } from '@/db/schemas/appointmentsSchema';
import { integrationApiKeys } from '@/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import crypto from 'crypto';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// API key validation
async function validateApiKey(apiKey: string, practiceId: number): Promise<boolean> {
  try {
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    const keyRecord = await tenantDb.query.integrationApiKeys.findFirst({
      where: and(
        eq(integrationApiKeys.practiceId, practiceId),
        eq(integrationApiKeys.keyHash, keyHash),
        eq(integrationApiKeys.isActive, true)
      )
    });
    
    return !!keyRecord;
  } catch (error) {
    console.error('API key validation error:', error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const searchParams = request.nextUrl.searchParams;
    const practiceId = searchParams.get('practiceId');
    const apiKey = searchParams.get('apiKey');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!practiceId || !apiKey) {
      return NextResponse.json({ error: 'Practice ID and API key are required' }, { status: 400, headers: corsHeaders });
    }

    const practiceIdNumber = parseInt(practiceId, 10);
    if (isNaN(practiceIdNumber)) {
      return NextResponse.json({ error: 'Invalid practice ID' }, { status: 400, headers: corsHeaders });
    }

    // Validate API key
    const isValidApiKey = await validateApiKey(apiKey, practiceIdNumber);
    if (!isValidApiKey) {
      return NextResponse.json(
        { error: 'Invalid API key or practice ID' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Default to next 3 months if no date range provided
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 3 months ahead

    // Get all booked appointments for the practice within the date range
    const bookedAppointments = await db
      .select({
        date: appointments.date,
        durationMinutes: appointments.durationMinutes,
        status: appointments.status
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.practiceId, practiceIdNumber),
          gte(appointments.date, start),
          lte(appointments.date, end),
          // Only include confirmed/active appointments (not cancelled, rejected, etc.)
          sql`${appointments.status} IN ('pending', 'approved', 'triage', 'active', 'in_treatment', 'in_progress', 'completed')`
        )
      );

    // Convert appointments to time slots format expected by the widget
    const bookedSlots: string[] = [];
    
    bookedAppointments.forEach(appointment => {
      const appointmentDate = new Date(appointment.date);
      const dateString = appointmentDate.toISOString().split('T')[0];
      const timeString = appointmentDate.toTimeString().slice(0, 5); // HH:MM format
      
      // Add the exact appointment time
      bookedSlots.push(`${dateString}_${timeString}`);
      
      // If appointment is longer than 30 minutes, block additional slots
      const duration = parseInt(String(appointment.durationMinutes || '30'));
      if (duration > 30) {
        const additionalSlots = Math.ceil((duration - 30) / 30);
        for (let i = 1; i <= additionalSlots; i++) {
          const nextSlotTime = new Date(appointmentDate.getTime() + (i * 30 * 60 * 1000));
          const nextTimeString = nextSlotTime.toTimeString().slice(0, 5);
          bookedSlots.push(`${dateString}_${nextTimeString}`);
        }
      }
    });

    return NextResponse.json({
      success: true,
      bookedSlots: bookedSlots,
      totalBookings: bookedAppointments.length,
      dateRange: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      }
    }, { 
      status: 200, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('Error fetching appointment availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointment availability' },
      { status: 500, headers: corsHeaders }
    );
  }
}
