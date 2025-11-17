/**
 * Sync Pull API
 * Sends server changes to offline clients
 * Handles incremental sync based on last sync timestamp
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { getTenantContext } from '@/lib/tenant-context';
import { getUserContextFromStandardRequest } from '@/lib/auth-context';
import { 
  appointments, 
  pets, 
  users,
  soapNotes,
  rooms,
  admissions,
  vaccinations,
  vaccineTypes,
  kennels,
  boardingStays
} from '@/db/schema';
import { gte, and, eq, isNull, or, ne } from 'drizzle-orm';
import { z } from 'zod';

const pullRequestSchema = z.object({
  lastSyncTimestamp: z.number().optional(),
  entityTypes: z.array(z.string()).optional(), // If specified, only pull these entities
  practiceId: z.number(),
});

interface PullResult {
  success: boolean;
  timestamp: number;
  changes: Array<{
    entityType: string;
    operation: 'create' | 'update' | 'delete';
    data: any;
    id: number;
    version?: number;
    updatedAt: string;
  }>;
  hasMore: boolean;
  nextTimestamp?: number;
}

/**
 * GET /api/sync/pull
 * Pull server changes to offline client
 */
export async function GET(req: NextRequest) {
  try {
    const userContext = await getUserContextFromStandardRequest(req);
    if (!userContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantContext = await getTenantContext();
    const db = await getCurrentTenantDb();
    
    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const lastSyncTimestamp = searchParams.get('lastSyncTimestamp') 
      ? parseInt(searchParams.get('lastSyncTimestamp')!) 
      : 0;
    const entityTypesParam = searchParams.get('entityTypes');
    const practiceId = parseInt(searchParams.get('practiceId') || '0');

    if (!practiceId) {
      return NextResponse.json({ error: 'Practice ID required' }, { status: 400 });
    }

    const entityTypes = entityTypesParam
      ? entityTypesParam.split(',')
      : ['appointments', 'pets', 'clients', 'practitioners', 'soapNotes', 'rooms', 'admissions', 'vaccinations', 'vaccine_types', 'kennels', 'boarding_stays'];

    console.log(`[SyncPull] Pulling changes since ${new Date(lastSyncTimestamp).toISOString()}`);
    console.log(`[SyncPull] Entity types requested: ${entityTypes.join(', ')}`);
    console.log(`[SyncPull] Practice ID: ${practiceId}`);

    const result: PullResult = {
      success: true,
      timestamp: Date.now(),
      changes: [],
      hasMore: false,
    };

    const lastSyncDate = new Date(lastSyncTimestamp);

    // Pull appointments (only pending status) - offline clients only need active appointments
    if (entityTypes.includes('appointments')) {
      // Pull ALL PENDING appointments regardless of deletedAt status
      const pendingAppointments = await db.query.appointments.findMany({
        where: and(
          eq(appointments.practiceId, practiceId),
          eq(appointments.status, 'pending')
          // No deletedAt filter - include all pending appointments
        ),
        with: {
          pet: true,
          client: true,
          practitioner: true,
        },
        limit: 500, // Limit for pending appointments
      });

      console.log(`[SyncPull] Found ${pendingAppointments.length} pending appointments`);

      for (const appointment of pendingAppointments) {
        // Always treat as CREATE - never send delete operations
        result.changes.push({
          entityType: 'appointments',
          operation: 'create', // Always create, never delete
          data: {
            ...appointment,
            // Include related data for offline use
            clientName: appointment.client?.name || appointment.client?.email || 'N/A',
            clientEmail: appointment.client?.email || '',
            petName: appointment.pet?.name || 'N/A',
            petType: appointment.pet?.species || 'N/A',
            // Practice-scoped metadata for IndexedDB storage
            tenantId: tenantContext.tenantId,
            practiceId: practiceId,
          },
          id: appointment.id,
          updatedAt: (appointment.updatedAt || appointment.createdAt).toISOString(),
        });
      }
    }

    // Pull pets
    // Pull ALL pets regardless of deletedAt status
    if (entityTypes.includes('pets')) {
      const changedPets = await db.query.pets.findMany({
        where: eq(pets.practiceId, practiceId),
        // No deletedAt filter - include all pets
        limit: 500,
      });

      console.log(`[SyncPull] Found ${changedPets.length} pets`);

      for (const pet of changedPets) {
        // Always treat as CREATE - never send delete operations
        result.changes.push({
          entityType: 'pets',
          operation: 'create', // Always create, never delete
          data: {
            ...pet,
            // Practice-scoped metadata for IndexedDB storage
            tenantId: tenantContext.tenantId,
            practiceId: practiceId,
          },
          id: pet.id,
          updatedAt: (pet.updatedAt || pet.createdAt).toISOString(),
        });
      }
    }

    // Pull clients (users)
    // Pull ALL clients regardless of deletedAt status
    if (entityTypes.includes('clients')) {
      const changedClients = await db.query.users.findMany({
        where: and(
          eq(users.practiceId, practiceId),
          eq(users.role, 'CLIENT')
        ),
        // No deletedAt filter - include all users
        limit: 500,
      });

      console.log(`[SyncPull] Found ${changedClients.length} clients`);

      for (const client of changedClients) {
        // Always treat as CREATE - never send delete operations
        result.changes.push({
          entityType: 'clients',
          operation: 'create', // Always create, never delete
          data: {
            ...client,
            // Practice-scoped metadata for IndexedDB storage
            tenantId: tenantContext.tenantId,
            practiceId: practiceId,
          },
          id: client.id,
          updatedAt: (client.updatedAt || client.createdAt).toISOString(),
        });
      }
    }

    // Pull practitioners (all users who are not clients)
    // Pull ALL practitioners regardless of deletedAt status
    if (entityTypes.includes('practitioners')) {
      const changedPractitioners = await db.query.users.findMany({
        where: and(
          eq(users.practiceId, practiceId),
          ne(users.role, 'CLIENT')
        ),
        // No deletedAt filter - include all users
        limit: 500,
      });

      console.log(`[SyncPull] Found ${changedPractitioners.length} practitioners`);

      for (const practitioner of changedPractitioners) {
        // Always treat as CREATE - never send delete operations
        result.changes.push({
          entityType: 'practitioners',
          operation: 'create', // Always create, never delete
          data: {
            ...practitioner,
            // Practice-scoped metadata for IndexedDB storage
            tenantId: tenantContext.tenantId,
            practiceId: practiceId,
          },
          id: practitioner.id,
          updatedAt: (practitioner.updatedAt || practitioner.createdAt).toISOString(),
        });
      }
    }

    // Pull rooms (admission rooms)
    // Pull ALL rooms for the practice
    if (entityTypes.includes('rooms')) {
      const changedRooms = await db.query.rooms.findMany({
        where: eq(rooms.practiceId, practiceId),
        limit: 500,
      });

      console.log(`[SyncPull] Found ${changedRooms.length} rooms`);

      for (const room of changedRooms) {
        result.changes.push({
          entityType: 'rooms',
          operation: 'create',
          data: {
            ...room,
            // Practice-scoped metadata for IndexedDB storage
            tenantId: tenantContext.tenantId,
            practiceId: practiceId,
          },
          id: room.id,
          updatedAt: (room.updatedAt || room.createdAt).toISOString(),
        });
      }
    }

    // Pull admissions
    // Pull ACTIVE admissions (not discharged)
    if (entityTypes.includes('admissions')) {
      const changedAdmissions = await db.query.admissions.findMany({
        where: and(
          eq(admissions.practiceId, practiceId),
          or(
            eq(admissions.status, 'pending'),
            eq(admissions.status, 'admitted'),
            eq(admissions.status, 'hold'),
            eq(admissions.status, 'isolation')
          )
        ),
        with: {
          pet: true,
          client: true,
          attendingVet: true,
          room: true,
        },
        limit: 500,
      });

      console.log(`[SyncPull] Found ${changedAdmissions.length} active admissions`);

      for (const admission of changedAdmissions) {
        result.changes.push({
          entityType: 'admissions',
          operation: 'create',
          data: {
            ...admission,
            // Include related data for offline use
            petName: admission.pet?.name || 'N/A',
            clientName: admission.client?.name || admission.client?.email || 'N/A',
            attendingVetName: admission.attendingVet?.name || admission.attendingVet?.email || 'N/A',
            roomNumber: admission.room?.roomNumber || null,
            // Practice-scoped metadata for IndexedDB storage
            tenantId: tenantContext.tenantId,
            practiceId: practiceId,
          },
          id: admission.id,
          updatedAt: (admission.updatedAt || admission.createdAt).toISOString(),
        });
      }
    }

    // Pull vaccine types
    // Pull ALL active vaccine types for the practice (like rooms)
    if (entityTypes.includes('vaccine_types')) {
      const changedVaccineTypes = await db.query.vaccineTypes.findMany({
        where: and(
          eq(vaccineTypes.practiceId, practiceId),
          eq(vaccineTypes.isActive, true)
        ),
        limit: 500,
      });

      console.log(`[SyncPull] Found ${changedVaccineTypes.length} active vaccine types`);

      for (const vaccineType of changedVaccineTypes) {
        result.changes.push({
          entityType: 'vaccine_types',
          operation: 'create',
          data: {
            ...vaccineType,
            // Practice-scoped metadata for IndexedDB storage
            tenantId: tenantContext.tenantId,
            practiceId: practiceId,
          },
          id: vaccineType.id,
          updatedAt: (vaccineType.updatedAt || vaccineType.createdAt).toISOString(),
        });
      }
    }

    // Pull vaccinations
    // Pull ACTIVE vaccinations (completed, scheduled - not cancelled or missed)
    if (entityTypes.includes('vaccinations')) {
      const changedVaccinations = await db.query.vaccinations.findMany({
        where: and(
          eq(vaccinations.practiceId, practiceId),
          or(
            eq(vaccinations.status, 'completed'),
            eq(vaccinations.status, 'scheduled')
          )
        ),
        with: {
          pet: true,
          vaccineType: true,
          administeringVet: true,
        },
        limit: 500,
      });

      console.log(`[SyncPull] Found ${changedVaccinations.length} active vaccinations`);

      for (const vaccination of changedVaccinations) {
        result.changes.push({
          entityType: 'vaccinations',
          operation: 'create',
          data: {
            ...vaccination,
            // Include related data for offline use
            petName: vaccination.pet?.name || 'N/A',
            vaccineTypeName: vaccination.vaccineType?.name || null,
            administeringVetName: vaccination.administeringVet?.name || vaccination.administeringVet?.email || null,
            // Practice-scoped metadata for IndexedDB storage
            tenantId: tenantContext.tenantId,
            practiceId: practiceId,
          },
          id: vaccination.id,
          updatedAt: (vaccination.updatedAt || vaccination.createdAt).toISOString(),
        });
      }

        // Pull kennels (active)
        if (entityTypes.includes('kennels')) {
          const changedKennels = await db.query.kennels.findMany({
            where: and(
              eq(kennels.practiceId, practiceId),
              eq(kennels.isActive, true)
            ),
            limit: 500,
          });

          console.log(`[SyncPull] Found ${changedKennels.length} active kennels`);

          for (const kennel of changedKennels) {
            result.changes.push({
              entityType: 'kennels',
              operation: 'create',
              data: {
                ...kennel,
                tenantId: tenantContext.tenantId,
                practiceId: practiceId,
              },
              id: kennel.id,
              updatedAt: (kennel.updatedAt || kennel.createdAt).toISOString(),
            });
          }
        }

        // Pull boarding stays (active: scheduled/checked_in)
        if (entityTypes.includes('boarding_stays')) {
          const changedStays = await db.query.boardingStays.findMany({
            where: and(
              eq(boardingStays.practiceId, practiceId),
              or(
                eq(boardingStays.status, 'scheduled'),
                eq(boardingStays.status, 'checked_in')
              )
            ),
            with: {
              pet: true,
              kennel: true,
              createdBy: true,
            },
            limit: 500,
          });

          console.log(`[SyncPull] Found ${changedStays.length} active boarding stays`);

          for (const stay of changedStays) {
            result.changes.push({
              entityType: 'boarding_stays',
              operation: 'create',
              data: {
                ...stay,
                petName: stay.pet?.name || 'N/A',
                kennelName: stay.kennel?.name || 'N/A',
                createdByName: stay.createdBy?.name || stay.createdBy?.email || 'N/A',
                tenantId: tenantContext.tenantId,
                practiceId: practiceId,
              },
              id: stay.id,
              updatedAt: (stay.updatedAt || stay.createdAt).toISOString(),
            });
          }
        }
    }

    // Check if there are more records
    result.hasMore = result.changes.length >= 100;
    if (result.hasMore && result.changes.length > 0) {
      const lastChange = result.changes[result.changes.length - 1];
      result.nextTimestamp = new Date(lastChange.updatedAt).getTime();
    }

    // Log detailed breakdown
    const breakdown = result.changes.reduce((acc, change) => {
      acc[change.entityType] = (acc[change.entityType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(`[SyncPull] ✅ Successfully pulled data for practice ${practiceId}`);
    console.log(`[SyncPull] 📊 Entity types requested: ${entityTypes.join(', ')}`);
    console.log(`[SyncPull] 📦 Total changes: ${result.changes.length}`);
    console.log(`[SyncPull] 🔢 Changes breakdown:`, breakdown);
    console.log(`[SyncPull] 📋 Entities with data: ${Object.keys(breakdown).join(', ')}`);
    console.log(`[SyncPull] ⚠️  Entities with no data: ${entityTypes.filter(et => !breakdown[et]).join(', ') || 'none'}`);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[SyncPull] Error:', error);
    return NextResponse.json(
      { error: 'Sync pull failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sync/pull (alternative for complex queries)
 */
export async function POST(req: NextRequest) {
  try {
    const userContext = await getUserContextFromStandardRequest(req);
    if (!userContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = pullRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Use GET handler logic with POST body
    const searchParams = new URLSearchParams();
    searchParams.set('lastSyncTimestamp', String(validation.data.lastSyncTimestamp || 0));
    searchParams.set('practiceId', String(validation.data.practiceId));
    if (validation.data.entityTypes && Array.isArray(validation.data.entityTypes)) {
      searchParams.set('entityTypes', validation.data.entityTypes.join(','));
    }

    // Create a mock request with the params
    const url = new URL(req.url);
    url.search = searchParams.toString();
    
    const mockReq = new NextRequest(url);
    return await GET(mockReq);
  } catch (error) {
    console.error('[SyncPull] Error:', error);
    return NextResponse.json(
      { error: 'Sync pull failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
