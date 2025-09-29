// src/app/api/test-soap/route.ts
import { NextResponse } from "next/server";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { soapNotes } from "@/db/schemas/soapNoteSchema";
import { pets } from "@/db/schemas/petsSchema";
import { appointments } from "@/db/schemas/appointmentsSchema";
import { users } from "@/db/schemas/usersSchema";

export async function POST(request: Request) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const data = await request.json();
    
    console.log("Test SOAP creation data:", data);
    
    // Validate that required fields exist
    if (!data.petId || !data.practitionerId) {
      return NextResponse.json(
        { error: "Pet ID and Practitioner ID are required" },
        { status: 400 }
      );
    }
    
    // Check if pet exists
    const pet = await tenantDb.query.pets.findFirst({
      where: (pets, { eq }) => eq(pets.id, data.petId)
    });
    
    if (!pet) {
      return NextResponse.json(
        { error: "Pet not found" },
        { status: 404 }
      );
    }
    
    // Check if practitioner exists
    const practitioner = await tenantDb.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, data.practitionerId)
    });
    
    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }
    
    // Create test SOAP note
    // @ts-ignore
    const [newSoapNote] = await tenantDb.insert(soapNotes).values({
      petId: data.petId,
      practitionerId: data.practitionerId,
      appointmentId: data.appointmentId || null,
      subjective: data.subjective || "Test subjective findings",
      objective: data.objective || "Test objective examination",
      assessment: data.assessment || "Test assessment and diagnosis",
      plan: data.plan || "Test treatment plan",
    }).returning();
    
    return NextResponse.json({
      success: true,
      soapNote: newSoapNote,
      pet: pet,
      practitioner: practitioner
    }, { status: 201 });
    
  } catch (error) {
    console.error("Error creating test SOAP note:", error);
    return NextResponse.json(
      { 
        error: "Failed to create test SOAP note",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check available pets and users
export async function GET() {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const allPets = await tenantDb.query.pets.findMany({
      limit: 5
    });
    
    const allUsers = await tenantDb.query.users.findMany({
      limit: 5
    });
    
    const allAppointments = await tenantDb.query.appointments.findMany({
      limit: 5
    });
    
    return NextResponse.json({
      pets: allPets,
      users: allUsers,
      appointments: allAppointments
    });
    
  } catch (error) {
    console.error("Error fetching test data:", error);
    return NextResponse.json(
      { error: "Failed to fetch test data" },
      { status: 500 }
    );
  }
}
