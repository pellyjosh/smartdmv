import { NextResponse, NextRequest } from "next/server";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { healthPlans, pets, healthPlanMilestones } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const user = await getCurrentUser(request);
    
    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Unauthorized. Client access required.' }, { status: 401 });
    }

    console.log('Fetching health plans for client ID:', user.id);

    // First, get all pets owned by this client
    const userPets = await tenantDb.query.pets.findMany({
      where: eq(pets.ownerId, user.id),
      columns: { id: true }
    });

    if (userPets.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const petIds = userPets.map(pet => pet.id);

    // Then get health plans for all their pets with their actual milestones
    const healthPlansData = await tenantDb.query.healthPlans.findMany({
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
        },
        milestones: {
          orderBy: (healthPlanMilestones, { asc }) => [asc(healthPlanMilestones.dueDate)]
        }
      },
      orderBy: (healthPlans, { desc }) => [desc(healthPlans.createdAt)]
    });

    console.log(`Found ${healthPlansData.length} health plans for client ${user.id}`);
    
    // Log milestones for debugging
    healthPlansData.forEach((plan, index) => {
      console.log(`Health Plan ${index + 1} (ID: ${plan.id}): ${plan.milestones?.length || 0} milestones`);
      plan.milestones?.forEach((milestone, mIndex) => {
        console.log(`  Milestone ${mIndex + 1}: ${milestone.title} (completed: ${milestone.completed})`);
      });
    });

    // Transform the data to match the frontend expectations
    const transformedHealthPlans = healthPlansData.map((plan: any) => {
      // Transform actual milestones from database
      const transformedMilestones = (plan.milestones || []).map((milestone: any) => ({
        id: milestone.id,
        title: milestone.title,
        description: milestone.description || '',
        completed: milestone.completed,
        dueDate: milestone.dueDate?.toISOString(),
        completedOn: milestone.completedOn?.toISOString(),
      }));

      console.log(`📋 Health Plan "${plan.name}" has ${transformedMilestones.length} real milestones`);

      return {
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
        milestones: transformedMilestones // Use actual milestones from database
      };
    });

    return NextResponse.json(transformedHealthPlans, { status: 200 });
  } catch (error) {
    console.error('Error fetching client health plans:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch health plans due to a server error. Please try again later.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
