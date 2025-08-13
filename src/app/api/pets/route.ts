import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db/index";
import { pets, appointments } from "@/db/schema";
import { eq, and, or, inArray } from "drizzle-orm";
import { withNetworkErrorHandlingAndRetry } from "@/lib/api-middleware";

const getHandler = async (request: NextRequest) => {
  const url = new URL(request.url);
  const clientId = url.searchParams.get('clientId');
  const practiceId = url.searchParams.get('practiceId');
  const hasActiveAppointments = url.searchParams.get('hasActiveAppointments') === 'true';

  console.log('Request URL:', request.url);
  console.log('Extracted Client ID:', clientId);
  console.log('Extracted Practice ID:', practiceId);
  console.log('Has Active Appointments Filter:', hasActiveAppointments);

  if (clientId) {
    const clientIdInt = parseInt(clientId);
    if (isNaN(clientIdInt)) {
      return NextResponse.json({ error: 'Invalid client ID format. Must be a number.' }, { status: 400 });
    }
    
    const petsData = await db.query.pets.findMany({
      where: eq(pets.ownerId, clientIdInt),
      with: {
        owner: true
      }
    });
    if (petsData.length === 0) {
      console.log('No pets found for Client ID:', clientId);
      return NextResponse.json({ error: 'No pets found for this client. Please ensure the client ID is correct and data exists in the database.' }, { status: 404 });
    }
    return NextResponse.json(petsData, { status: 200 });
  } else if (practiceId) {
    const practiceIdInt = parseInt(practiceId);
    if (isNaN(practiceIdInt)) {
      return NextResponse.json({ error: 'Invalid practice ID format. Must be a number.' }, { status: 400 });
    }
    
    let petsData;
    
    if (hasActiveAppointments) {
      // First get all active appointments to find the pet IDs
      const activeAppointments = await db.query.appointments.findMany({
        where: or(
          eq(appointments.status, 'scheduled'),
          eq(appointments.status, 'confirmed'),
          eq(appointments.status, 'in_progress')
        ),
        columns: {
          petId: true
        }
      });
        
      const petIds = [...new Set(activeAppointments.map(apt => apt.petId).filter(id => id !== null))] as number[]; // Remove duplicates and nulls
      
      if (petIds.length === 0) {
        console.log('No pets found with active appointments for this practice.');
        return NextResponse.json({ error: 'No pets found with active appointments for this practice.' }, { status: 404 });
      }
      
      // Get pet details for pets with active appointments that belong to this practice
      petsData = await db.query.pets.findMany({
        where: and(
          eq(pets.practiceId, practiceIdInt),
          inArray(pets.id, petIds)
        ),
        with: {
          owner: true
        }
      });
    } else {
      petsData = await db.query.pets.findMany({
        where: eq(pets.practiceId, practiceIdInt),
        with: {
          owner: true
        }
      });
    }
    
    if (petsData.length === 0) {
      const message = hasActiveAppointments 
        ? 'No pets found with active appointments for this practice.' 
        : 'No pets found for this practice. Please ensure the practice ID is correct and data exists in the database.';
      console.log(message);
      return NextResponse.json([], { status: 200 });
    }
    return NextResponse.json(petsData, { status: 200 });
  } else {
    return NextResponse.json({ error: 'Invalid parameters. Please provide a valid client ID or practice ID as a query parameter.' }, { status: 400 });
  }
};

export const GET = withNetworkErrorHandlingAndRetry(getHandler);
