// src/app/api/soap/appointments/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db/index";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeCompleted = searchParams.get("includeCompleted") === "true";
    
    let appointmentsList;
    
    if (includeCompleted) {
      // Include all appointments
      appointmentsList = await db.query.appointments.findMany({
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
      // Only include appointments that haven't had SOAP notes created yet
      // This would require a more complex query joining with soap_notes table
      appointmentsList = await db.query.appointments.findMany({
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
    
    return NextResponse.json(appointmentsList);
  } catch (error) {
    console.error("Error fetching appointments for SOAP:", error);
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 }
    );
  }
}
