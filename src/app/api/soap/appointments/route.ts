// src/app/api/soap/appointments/route.ts
import { NextResponse } from "next/server";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { appointments } from "@/db/schema";
import { eq, or, and, lte } from "drizzle-orm";
import { withNetworkErrorHandlingAndRetry } from "@/lib/api-middleware";

const getHandler = async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const includeCompleted = searchParams.get("includeCompleted") === "true";
  const status = searchParams.get("status");
  const petIdParam = searchParams.get("petId");
  
  console.log('SOAP Appointments API - Parameters received:', {
    includeCompleted,
    status,
    petIdParam,
    petIdType: typeof petIdParam
  });
  
  let appointmentsList;
  
  // Build where conditions based on parameters
  let whereConditions = [];
  
  if (status === "active") {
    // Only active appointments (scheduled, confirmed, in_progress)
    whereConditions.push(or(
      eq(appointments.status, 'scheduled'),
      eq(appointments.status, 'confirmed'),
      eq(appointments.status, 'in_progress'),
      eq(appointments.status, 'approved')
    ));
  } else if (!includeCompleted) {
    // Default behavior - exclude completed appointments
    whereConditions.push(or(
      eq(appointments.status, 'scheduled'),
      eq(appointments.status, 'confirmed'),
      eq(appointments.status, 'in_progress')
    ));
  }
  
  // Add pet filter if provided
  if (petIdParam) {
    const petId = parseInt(petIdParam);
    console.log('SOAP Appointments API - Filtering by petId:', petId);
    if (!isNaN(petId)) {
      whereConditions.push(eq(appointments.petId, petId));
    } else {
      console.error('SOAP Appointments API - Invalid petId provided:', petIdParam);
    }
  }
  
  // Exclude future appointments - only show appointments from today or earlier
  const today = new Date();
  today.setHours(23, 59, 59, 999); // Set to end of today to include appointments from today
  whereConditions.push(lte(appointments.date, today));
  
  console.log('SOAP Appointments API - Filtering appointments up to:', today);
  
  // Combine all conditions with AND
  const whereCondition = whereConditions.length > 0 ? 
    (whereConditions.length === 1 ? whereConditions[0] : and(...whereConditions)) : 
    undefined;
  
  if (whereCondition) {
    appointmentsList = await tenantDb.query.appointments.findMany({
      where: whereCondition,
      with: {
        pet: {
          with: {
            owner: true
          }
        },
        client: true,
        practitioner: true,
        practice: true
      },
      orderBy: (appointments, { desc }) => [desc(appointments.date)]
    });
  } else {
    // Include all appointments
    appointmentsList = await tenantDb.query.appointments.findMany({
      with: {
        pet: {
          with: {
            owner: true
          }
        },
        client: true,
        practitioner: true,
        practice: true
      },
      orderBy: (appointments, { desc }) => [desc(appointments.date)]
    });
  }
  
  // console.log('SOAP Appointments API - Returning appointments:', {
  //   count: appointmentsList.length,
  //   appointments: appointmentsList.map(apt => ({ 
  //     id: apt.id, 
  //     petId: apt.petId, 
  //     title: apt.title,
  //     date: apt.date,
  //     petName: apt.pet?.name
  //   }))
  // });

  return NextResponse.json(appointmentsList);
};

export const GET = withNetworkErrorHandlingAndRetry(getHandler);
