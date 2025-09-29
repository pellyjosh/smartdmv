import { NextResponse, NextRequest } from "next/server";
import { getUserPractice, getCurrentUser } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { pets, appointments } from "@/db/schema";
import { eq, and, or, inArray } from "drizzle-orm";
import { withNetworkErrorHandlingAndRetry } from "@/lib/api-middleware";
import { logView, logCreate } from '@/lib/audit-logger';

const getHandler = async (request: NextRequest) => {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

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
    
    const petsData = await tenantDb.query.pets.findMany({
      where: eq(pets.ownerId, clientIdInt),
      with: {
        owner: true
      }
    });
    if (petsData.length === 0) {
      console.log('No pets found for Client ID:', clientId);
      // Return an empty array with 200 so the UI can show a friendly empty state
      return NextResponse.json([], { status: 200 });
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
      const activeAppointments = await tenantDb.query.appointments.findMany({
        where: or(
          eq(appointments.status, 'scheduled'),
          eq(appointments.status, 'confirmed'),
          eq(appointments.status, 'in_progress')
        ),
        columns: {
          petId: true
        }
      });
        
      const petIds = [...new Set(activeAppointments.map((apt: any) => apt.petId).filter((id: any) => id !== null))] as number[]; // Remove duplicates and nulls
      
      if (petIds.length === 0) {
        console.log('No pets found with active appointments for this practice.');
        return NextResponse.json({ error: 'No pets found with active appointments for this practice.' }, { status: 404 });
      }
      
      // Get pet details for pets with active appointments that belong to this practice
      petsData = await tenantDb.query.pets.findMany({
        where: and(
          eq(pets.practiceId, practiceIdInt),
          inArray(pets.id, petIds)
        ),
        with: {
          owner: true
        }
      });
    } else {
      petsData = await tenantDb.query.pets.findMany({
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
    // No query params provided: attempt to return pets for the current user's practice (if staff)
    try {
      const user = await getCurrentUser(request as any);
      if (user && (user as any).practiceId) {
        const practiceIdInt = Number((user as any).practiceId);
        if (!Number.isFinite(practiceIdInt)) return NextResponse.json([], { status: 200 });
        const petsData = await tenantDb.query.pets.findMany({ where: eq(pets.practiceId, practiceIdInt), with: { owner: true } });
        return NextResponse.json(petsData, { status: 200 });
      }
    } catch (e) {
      // fall through
    }

    // Fallback: return empty array so callers that expect [] won't break
    return NextResponse.json([], { status: 200 });
  }
};

export const GET = withNetworkErrorHandlingAndRetry(getHandler);

// Create pet (wrapped with retry-aware error handler)
const postHandler = async (request: NextRequest) => {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const body = await request.json();
  const {
    name,
    species,
    breed,
    dateOfBirth,
    weight,
    allergies,
    color,
    gender,
    microchipNumber,
    pet_type,
    photoPath,
    ownerId,
    practiceId,
  } = body || {};

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (!ownerId || !practiceId) {
    return NextResponse.json({ error: 'ownerId and practiceId are required' }, { status: 400 });
  }

  const ownerIdInt = parseInt(String(ownerId), 10);
  const practiceIdInt = parseInt(String(practiceId), 10);
  if (!Number.isFinite(ownerIdInt) || !Number.isFinite(practiceIdInt)) {
    return NextResponse.json({ error: 'Invalid ownerId or practiceId' }, { status: 400 });
  }

  const dob = dateOfBirth ? new Date(dateOfBirth) : null;

  const [inserted] = await tenantDb.insert(pets).values({
    name,
    species: species ?? null,
    breed: breed ?? null,
    dateOfBirth: dob,
    ownerId: ownerIdInt as any,
    practiceId: practiceIdInt as any,
    weight: weight ?? null,
    allergies: allergies ?? null,
    color: color ?? null,
    gender: gender ?? null,
    microchipNumber: microchipNumber ?? null,
    pet_type: pet_type ?? null,
    photoPath: photoPath ?? null,
  }).returning();

  return NextResponse.json(inserted, { status: 201 });
};

export const POST = withNetworkErrorHandlingAndRetry(postHandler);
