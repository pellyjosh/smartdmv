import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db/index";
import { healthPlans, pets } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Unauthorized. Client access required.' }, { status: 401 });
    }

    console.log('Fetching health plans for client ID:', user.id);

    // First, get all pets owned by this client
    const userPets = await db.query.pets.findMany({
      where: eq(pets.ownerId, user.id),
      columns: { id: true }
    });

    if (userPets.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const petIds = userPets.map(pet => pet.id);

    // Then get health plans for all their pets
    const healthPlansData = await db.query.healthPlans.findMany({
      where: inArray(healthPlans.petId, petIds),
      with: {
        pet: {
          columns: {
            id: true,
            name: true,
            species: true,
          }
        },
        practice: {
          columns: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: (healthPlans, { desc }) => [desc(healthPlans.createdAt)]
    });

    console.log(`Found ${healthPlansData.length} health plans for client ${user.id}`);

    // Transform the data to match the frontend expectations
    const transformedHealthPlans = healthPlansData.map((plan: any) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      petId: plan.petId,
      petName: plan.pet?.name,
      status: plan.status,
      planType: plan.planType || 'General Wellness',
      startDate: plan.startDate?.toISOString(),
      endDate: plan.endDate?.toISOString(),
      notes: plan.description,
      veterinarian: 'Dr. Smith', // Mock data - you may want to add this relationship
      // Mock milestones - you may want to create a separate milestones table
      milestones: [
        {
          id: 1,
          title: 'Initial Health Assessment',
          description: 'Complete physical examination and baseline health metrics',
          completed: true,
          dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 2,
          title: 'Vaccination Update',
          description: 'Ensure all vaccinations are current',
          completed: plan.status === 'completed',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 3,
          title: 'Follow-up Consultation',
          description: 'Review progress and adjust plan as needed',
          completed: false,
          dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        }
      ]
    }));

    return NextResponse.json(transformedHealthPlans, { status: 200 });
  } catch (error) {
    console.error('Error fetching client health plans:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch health plans due to a server error. Please try again later.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
