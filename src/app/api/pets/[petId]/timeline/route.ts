import { NextResponse, NextRequest } from "next/server";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { 
  pets, 
  appointments, 
  soapNotes, 
  prescriptions, 
  assignedChecklists, 
  checklistItems, 
  healthPlans 
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth-utils";

export async function GET(request: NextRequest, context: { params: Promise<{ petId: string }> }) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const params = await context.params;
  const { petId } = params;
  const petIdInt = parseInt(petId, 10);
  
  if (!Number.isFinite(petIdInt)) {
    return NextResponse.json({ error: 'Invalid pet ID' }, { status: 400 });
  }

  console.log('Fetching timeline data for Pet ID:', petId);

  try {
    // Get current user for access control
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Verify pet exists and user has access
    const pet = await tenantDb.query.pets.findFirst({
      where: eq(pets.id, petIdInt),
      with: {
        owner: true
      }
    });

    if (!pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    }

    // Check practice access for non-super admins
    if (user.role !== 'SUPER_ADMIN' && user.practiceId !== pet.practiceId) {
      return NextResponse.json({ 
        error: 'You don\'t have permission to access this pet\'s timeline' 
      }, { status: 403 });
    }

    const timelineItems: any[] = [];

    try {
      // 2. Collect appointments (regular + telemedicine)
      const appointmentsData = await tenantDb.query.appointments.findMany({
        where: eq(appointments.petId, petIdInt),
        orderBy: [desc(appointments.date)]
      });

      const appointmentItems = appointmentsData.map(appointment => ({
        id: appointment.id,
        type: appointment.type === 'virtual' ? 'telemedicine' : 'appointment',
        title: appointment.title || 'Veterinary Appointment',
        description: appointment.description || `${appointment.type === 'virtual' ? 'Virtual' : 'In-person'} appointment`,
        date: appointment.date,
        status: appointment.status,
        petId: appointment.petId,
        petName: pet.name,
        metadata: {
          practitionerId: appointment.practitionerId,
          duration: appointment.durationMinutes,
          notes: appointment.description,
          appointmentType: appointment.type
        }
      }));

      timelineItems.push(...appointmentItems);
      console.log(`Added ${appointmentItems.length} appointment items`);
    } catch (err) {
      console.error('Error fetching appointments, continuing with other data:', err);
    }

    try {
      // 3. Gather SOAP notes
      const soapNotesData = await tenantDb.query.soapNotes.findMany({
        where: eq(soapNotes.petId, petIdInt),
        orderBy: [desc(soapNotes.createdAt)]
      });

      const soapNoteItems = soapNotesData.map(note => ({
        id: note.id,
        type: 'soap_note',
        title: 'Medical Examination Record',
        description: note.assessment || 'SOAP Note examination record',
        date: note.createdAt,
        status: note.locked ? 'locked' : 'active',
        petId: note.petId,
        petName: pet.name,
        metadata: {
          subjective: note.subjective,
          objective: note.objective,
          assessment: note.assessment,
          plan: note.plan,
          locked: note.locked,
          practitionerId: note.practitionerId
        }
      }));

      timelineItems.push(...soapNoteItems);
      console.log(`Added ${soapNoteItems.length} SOAP note items`);

      // 4. Collect prescriptions from SOAP notes
      for (const note of soapNotesData) {
        try {
          const prescriptionsData = await tenantDb.query.prescriptions.findMany({
            where: eq(prescriptions.soapNoteId, note.id),
            orderBy: [desc(prescriptions.createdAt)]
          });

          const prescriptionItems = prescriptionsData.map(prescription => ({
            id: prescription.id,
            type: 'prescription',
            title: `Prescription: ${prescription.medicationName}`,
            description: `${prescription.dosage} - ${prescription.route || 'As directed'}`,
            date: prescription.createdAt,
            status: prescription.status || 'active',
            petId: note.petId,
            petName: pet.name,
            metadata: {
              medication: prescription.medicationName,
              dosage: prescription.dosage,
              route: prescription.route,
              frequency: prescription.frequency,
              refills: prescription.refillsAllowed,
              soapNoteId: note.id
            }
          }));

          timelineItems.push(...prescriptionItems);
          console.log(`Added ${prescriptionItems.length} prescription items for SOAP note ${note.id}`);
        } catch (prescErr) {
          console.error(`Error fetching prescriptions for SOAP note ${note.id}:`, prescErr);
        }
      }
    } catch (err) {
      console.error('Error fetching SOAP notes, continuing with other data:', err);
    }

    try {
      // 5. Get assigned checklists
      const assignedChecklistsData = await tenantDb.query.assignedChecklists.findMany({
        where: eq(assignedChecklists.petId, petIdInt),
        orderBy: [desc(assignedChecklists.createdAt)]
      });

      const checklistsItems = assignedChecklistsData.map(checklist => ({
        id: checklist.id,
        type: 'checklist',
        title: checklist.name || 'Treatment Checklist',
        description: `Treatment protocol checklist`,
        date: checklist.createdAt,
        status: checklist.status || 'active',
        petId: checklist.petId,
        petName: pet.name,
        metadata: {
          templateId: checklist.templateId,
          assignedBy: checklist.assignedById,
          dueDate: checklist.dueDate,
          notes: checklist.notes
        }
      }));

      timelineItems.push(...checklistsItems);
      console.log(`Added ${checklistsItems.length} checklist items`);

      // 6. Get individual checklist tasks
      for (const checklist of assignedChecklistsData) {
        try {
          const checklistItemsData = await tenantDb.query.checklistItems.findMany({
            where: eq(checklistItems.checklistId, checklist.id),
            orderBy: [desc(checklistItems.createdAt)]
          });

          const checklistTaskItems = checklistItemsData.map(item => ({
            id: item.id,
            type: 'checklist_item',
            title: item.title || 'Checklist Task',
            description: item.description || 'Checklist task item',
            date: item.createdAt,
            status: item.completedAt ? 'completed' : 'pending',
            petId: checklist.petId,
            petName: pet.name,
            metadata: {
              checklistId: checklist.id,
              assignedTo: item.assignedToId,
              completedBy: item.completedById,
              completedAt: item.completedAt,
              dueDate: item.dueDate,
              priority: item.priority
            }
          }));

          timelineItems.push(...checklistTaskItems);
          console.log(`Added ${checklistTaskItems.length} checklist task items for checklist ${checklist.id}`);
        } catch (itemErr) {
          console.error(`Error fetching checklist items for checklist ${checklist.id}:`, itemErr);
        }
      }
    } catch (err) {
      console.error('Error fetching checklists, continuing with other data:', err);
    }

    try {
      // 7. Attempt health plan data
      const healthPlansData = await tenantDb.query.healthPlans.findMany({
        where: eq(healthPlans.petId, petIdInt),
        orderBy: [desc(healthPlans.createdAt)]
      });

      const healthPlanItems = healthPlansData.map(plan => ({
        id: plan.id,
        type: 'health_plan',
        title: plan.name || 'Health Plan',
        description: plan.description || 'Long-term care plan',
        date: plan.createdAt,
        status: plan.status,
        petId: plan.petId,
        petName: pet.name,
        metadata: {
          startDate: plan.startDate,
          endDate: plan.endDate,
          planType: plan.planType,
          description: plan.description
        }
      }));

      timelineItems.push(...healthPlanItems);
      console.log(`Added ${healthPlanItems.length} health plan items`);

      // Note: Health plan milestones would be added here if that table exists
      // This would require checking the healthPlanMilestones schema
    } catch (err) {
      console.error('Error fetching health plans, continuing with other data:', err);
    }

    // 8. Sort chronologically by date, most recent first
    const sortedItems = timelineItems.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });

    console.log(`Timeline aggregation complete: ${sortedItems.length} total items for pet ${petId}`);

    // Log summary by type
    const typeCounts = sortedItems.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('Timeline items by type:', typeCounts);

    return NextResponse.json(sortedItems, { status: 200 });

  } catch (error) {
    console.error('Error fetching timeline data:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch timeline data due to a server error. Please try again later.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
