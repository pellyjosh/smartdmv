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
  invoices 
} from '@/db/schema';
import { gte, and, eq, isNull, or } from 'drizzle-orm';
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
      : ['appointments', 'pets', 'clients', 'soapNotes', 'invoices'];

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
        where: eq(users.practiceId, practiceId),
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

    // Check if there are more records
    result.hasMore = result.changes.length >= 100;
    if (result.hasMore && result.changes.length > 0) {
      const lastChange = result.changes[result.changes.length - 1];
      result.nextTimestamp = new Date(lastChange.updatedAt).getTime();
    }

    console.log(`[SyncPull] Returning ${result.changes.length} changes`);
    console.log(`[SyncPull] Changes breakdown:`, result.changes.reduce((acc, change) => {
      acc[change.entityType] = (acc[change.entityType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>));

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
