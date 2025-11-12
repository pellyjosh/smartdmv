/**
 * Sync Push API
 * Receives batch operations from offline clients and applies them to the server database
 * Handles conflict detection and resolution
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
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Type definitions
type SyncOperationType = 'create' | 'update' | 'delete';

const syncOperationSchema = z.object({
  id: z.number().optional(),
  operation: z.enum(['create', 'update', 'delete', 'approve', 'reject']), // Added approve and reject
  entityType: z.string(),
  entityId: z.union([z.string(), z.number()]),
  data: z.any(),
  timestamp: z.number(),
  version: z.number().optional(),
  userId: z.union([z.string(), z.number()]), // Accept both string and number
  practiceId: z.number(),
  tenantId: z.string(),
});

const batchPushSchema = z.object({
  operations: z.array(syncOperationSchema),
  clientTimestamp: z.number(),
});

type SyncOperation = z.infer<typeof syncOperationSchema>;
type BatchPushRequest = z.infer<typeof batchPushSchema>;

interface PushResult {
  success: boolean;
  processed: number;
  failed: number;
  conflicts: number;
  results: Array<{
    operationId?: number;
    success: boolean;
    realId?: number;
    tempId?: string | number;
    entityType: string;
    conflict?: boolean;
    conflictData?: {
      localData: any;
      serverData: any;
      conflictType: string;
      affectedFields: string[];
    };
    error?: string;
  }>;
}

/**
 * Entity table mapping
 */
function getEntityTable(entityType: string) {
  const tables: Record<string, any> = {
    appointment: appointments,
    appointments: appointments,
    pet: pets,
    pets: pets,
    client: users,
    clients: users,
    user: users,
    users: users,
    soapNote: soapNotes,
    soapNotes: soapNotes,
    invoice: invoices,
    invoices: invoices,
  };
  return tables[entityType];
}

/**
 * POST /api/sync/push
 * Push offline changes to server
 */
export async function POST(req: NextRequest) {
  try {
    const userContext = await getUserContextFromStandardRequest(req);
    if (!userContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantContext = await getTenantContext();
    const db = await getCurrentTenantDb();
    const body = await req.json();

    // Validate request
    const validation = batchPushSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Extract operations with proper typing
    const requestData = validation.data;
    if (!requestData || !Array.isArray(requestData.operations)) {
      return NextResponse.json(
        { error: 'Invalid operations array' },
        { status: 400 }
      );
    }

    const operations = requestData.operations;

    console.log(`[SyncPush] Processing ${operations.length} operations`);

    const result: PushResult = {
      success: true,
      processed: 0,
      failed: 0,
      conflicts: 0,
      results: [],
    };

    // Process each operation
    for (const op of operations) {
      try {
        // Verify tenant match by ID (not subdomain)
        if (op.tenantId !== tenantContext.tenantId) {
          console.error('[SyncPush] Tenant mismatch:', {
            operationTenantId: op.tenantId,
            operationTenantIdType: typeof op.tenantId,
            contextTenantId: tenantContext.tenantId,
            contextTenantIdType: typeof tenantContext.tenantId,
            operation: op.operation,
            entityType: op.entityType,
            entityId: op.entityId,
          });
          result.failed++;
          result.results.push({
            operationId: op.id,
            success: false,
            entityType: op.entityType,
            error: `Tenant mismatch: operation has '${op.tenantId}' but context expects '${tenantContext.tenantId}'`,
          });
          continue;
        }

        const table = getEntityTable(op.entityType);
        if (!table) {
          result.failed++;
          result.results.push({
            operationId: op.id,
            success: false,
            entityType: op.entityType,
            error: `Unknown entity type: ${op.entityType}`,
          });
          continue;
        }

        // Handle different operations
        switch (op.operation) {
          case 'create': {
            // Remove temp ID if present
            const { id, ...dataWithoutId } = op.data;
            const tempId = id;

            // Special handling for appointments - derive clientId from pet
            let finalData = { ...dataWithoutId };
            
            if (op.entityType === 'appointments' || op.entityType === 'appointment') {
              // If petId exists, get the pet's ownerId to set as clientId
              if (dataWithoutId.petId) {
                const pet = await db.query.pets.findFirst({
                  where: eq(pets.id, dataWithoutId.petId),
                });
                
                if (pet) {
                  finalData.clientId = pet.ownerId;
                } else {
                  // Pet not found - fail the operation
                  result.failed++;
                  result.results.push({
                    operationId: op.id,
                    success: false,
                    entityType: op.entityType,
                    error: 'Pet not found for appointment',
                  });
                  continue;
                }
              }
              
              // Ensure date is a Date object
              if (finalData.date && typeof finalData.date === 'string') {
                finalData.date = new Date(finalData.date);
              }
              
              // Convert duration to string if it's a number
              if (finalData.durationMinutes && typeof finalData.durationMinutes === 'number') {
                finalData.durationMinutes = finalData.durationMinutes.toString();
              }
            }

            // Insert new record
            const [newRecord] = await db.insert(table).values(finalData).returning();

            result.processed++;
            result.results.push({
              operationId: op.id,
              success: true,
              realId: newRecord.id,
              tempId: tempId,
              entityType: op.entityType,
            });
            
            console.log(`[SyncPush] Created ${op.entityType} with real ID ${newRecord.id} (temp ID: ${tempId})`);
            break;
          }

          case 'update': {
            // Get the proper query table name
            const queryTableName = op.entityType === 'appointment' ? 'appointments' : 
                                 op.entityType === 'pet' ? 'pets' :
                                 op.entityType === 'client' ? 'users' :
                                 op.entityType === 'soapNote' ? 'soapNotes' :
                                 op.entityType;
            
            // Check for existing record
            const existing = await db.query[queryTableName]?.findFirst({
              where: eq(table.id, op.entityId),
            });

            if (!existing) {
              result.failed++;
              result.results.push({
                operationId: op.id,
                success: false,
                entityType: op.entityType,
                error: 'Record not found',
              });
              continue;
            }

            // Detect conflicts
            const conflict = detectConflict(existing, op.data, op.timestamp);

            if (conflict) {
              result.conflicts++;
              result.results.push({
                operationId: op.id,
                success: false,
                entityType: op.entityType,
                conflict: true,
                conflictData: {
                  localData: op.data,
                  serverData: existing,
                  conflictType: conflict.type,
                  affectedFields: conflict.affectedFields,
                },
              });
              continue;
            }

            // Update record
            await db
              .update(table)
              .set({
                ...op.data,
                updatedAt: new Date(),
              })
              .where(eq(table.id, op.entityId));

            result.processed++;
            result.results.push({
              operationId: op.id,
              success: true,
              entityType: op.entityType,
            });
            break;
          }

          case 'delete': {
            // Soft delete by setting deletedAt
            await db
              .update(table)
              .set({
                deletedAt: new Date(),
              })
              .where(eq(table.id, op.entityId));

            result.processed++;
            result.results.push({
              operationId: op.id,
              success: true,
              entityType: op.entityType,
            });
            break;
          }

          case 'approve': {
            // Approve appointment request (change status from pending to approved)
            if (op.entityType !== 'appointments' && op.entityType !== 'appointment') {
              result.failed++;
              result.results.push({
                operationId: op.id,
                success: false,
                entityType: op.entityType,
                error: 'Approve operation only valid for appointments',
              });
              continue;
            }

            // Check if appointment exists and is pending
            const appointment = await db.query.appointments.findFirst({
              where: eq(appointments.id, op.entityId),
            });

            if (!appointment) {
              result.failed++;
              result.results.push({
                operationId: op.id,
                success: false,
                entityType: op.entityType,
                error: 'Appointment not found',
              });
              continue;
            }

            if (appointment.status !== 'pending') {
              result.failed++;
              result.results.push({
                operationId: op.id,
                success: false,
                entityType: op.entityType,
                error: 'Appointment is not in pending state',
              });
              continue;
            }

            // Update status to approved
            await db
              .update(appointments)
              .set({
                status: 'approved',
                updatedAt: new Date(),
              })
              .where(eq(appointments.id, op.entityId));

            result.processed++;
            result.results.push({
              operationId: op.id,
              success: true,
              entityType: op.entityType,
            });
            
            console.log(`[SyncPush] Approved appointment ${op.entityId}`);
            break;
          }

          case 'reject': {
            // Reject appointment request (change status from pending to rejected)
            if (op.entityType !== 'appointments' && op.entityType !== 'appointment') {
              result.failed++;
              result.results.push({
                operationId: op.id,
                success: false,
                entityType: op.entityType,
                error: 'Reject operation only valid for appointments',
              });
              continue;
            }

            // Check if appointment exists and is pending
            const appointment = await db.query.appointments.findFirst({
              where: eq(appointments.id, op.entityId),
            });

            if (!appointment) {
              result.failed++;
              result.results.push({
                operationId: op.id,
                success: false,
                entityType: op.entityType,
                error: 'Appointment not found',
              });
              continue;
            }

            if (appointment.status !== 'pending') {
              result.failed++;
              result.results.push({
                operationId: op.id,
                success: false,
                entityType: op.entityType,
                error: 'Appointment is not in pending state',
              });
              continue;
            }

            // Get rejection reason from data
            const rejectionReason = op.data?.rejectionReason || 'No reason provided';

            // Update status to rejected with reason
            await db
              .update(appointments)
              .set({
                status: 'rejected',
                description: `REJECTED: ${rejectionReason}`,
                updatedAt: new Date(),
              })
              .where(eq(appointments.id, op.entityId));

            result.processed++;
            result.results.push({
              operationId: op.id,
              success: true,
              entityType: op.entityType,
            });
            
            console.log(`[SyncPush] Rejected appointment ${op.entityId}: ${rejectionReason}`);
            break;
          }

          default:
            result.failed++;
            result.results.push({
              operationId: op.id,
              success: false,
              entityType: op.entityType,
              error: `Unknown operation: ${op.operation}`,
            });
        }
      } catch (error) {
        console.error('[SyncPush] Operation error:', error);
        result.failed++;
        result.results.push({
          operationId: op.id,
          success: false,
          entityType: op.entityType,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    result.success = result.failed === 0 && result.conflicts === 0;

    console.log(
      `[SyncPush] Complete: ${result.processed} processed, ${result.failed} failed, ${result.conflicts} conflicts`
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('[SyncPush] Error:', error);
    return NextResponse.json(
      { error: 'Sync push failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Detect conflicts between local and server data
 */
function detectConflict(
  serverData: any,
  localData: any,
  localTimestamp: number
): { type: string; affectedFields: string[] } | null {
  // Check if server was modified after local changes
  const serverModified = new Date(serverData.updatedAt || serverData.createdAt).getTime();
  
  if (serverModified > localTimestamp) {
    // Find conflicting fields
    const affectedFields: string[] = [];
    
    for (const key in localData) {
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;
      
      if (JSON.stringify(serverData[key]) !== JSON.stringify(localData[key])) {
        affectedFields.push(key);
      }
    }

    if (affectedFields.length > 0) {
      return {
        type: 'timestamp',
        affectedFields,
      };
    }
  }

  return null;
}
