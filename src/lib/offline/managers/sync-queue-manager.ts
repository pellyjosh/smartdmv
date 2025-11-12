/**
 * Sync Queue Manager
 * Manages sync operations and dependency resolution
 */

import * as syncQueueStorage from '../storage/sync-queue-storage';
import * as entityStorage from '../storage/entity-storage';
import { getOfflineTenantContext } from '../core/tenant-context';
import type {
  SyncOperation,
  SyncOperationType,
  SyncPriority,
  SyncQueueStats,
  DependencyNode,
} from '../types/sync.types';
import { isTempId } from '../utils/encryption';

/**
 * Sync Queue Manager Class
 */
class SyncQueueManager {
  /**
   * Add operation to queue
   */
  async addOperation(
    entityType: string,
    entityId: number | string,
    operation: SyncOperationType,
    data?: any,
    priority: SyncPriority = 'normal'
  ): Promise<number> {
    const context = await getOfflineTenantContext();
    if (!context) {
      throw new Error('No tenant context available');
    }

    const relationships = this.extractRelationships(data);
    const requiredPermissions = [`${entityType}:${operation}`];

    return syncQueueStorage.queueOperation({
      tenantId: context.tenantId,
      practiceId: context.practiceId,
      userId: context.userId,
      entityType,
      entityId,
      operation,
      data,
      relationships,
      priority,
      maxRetries: Infinity, // Unlimited retries
      requiredPermissions,
      version: data?.version || 1,
    });
  }

  /**
   * Get pending operations
   */
  async getPending(limit?: number): Promise<SyncOperation[]> {
    const context = await getOfflineTenantContext();
    if (!context) {
      return [];
    }

    return syncQueueStorage.getPendingOperations(context.tenantId, limit);
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<SyncQueueStats> {
    const context = await getOfflineTenantContext();
    if (!context) {
      return {
        total: 0,
        pending: 0,
        inProgress: 0,
        failed: 0,
        conflicted: 0,
        byEntityType: {},
        byPriority: { high: 0, normal: 0, low: 0 },
      };
    }

    return syncQueueStorage.getQueueStats(context.tenantId);
  }

  /**
   * Get operations for specific entity
   */
  async getOperationsForEntity(
    entityType: string,
    entityId: number | string
  ): Promise<SyncOperation[]> {
    const context = await getOfflineTenantContext();
    if (!context) {
      return [];
    }

    return syncQueueStorage.getOperationsByEntity(
      entityType,
      entityId,
      context.tenantId
    );
  }

  /**
   * Build dependency graph for operations
   */
  async buildDependencyGraph(operations: SyncOperation[]): Promise<DependencyNode[]> {
    const nodes: DependencyNode[] = [];
    const tempIdMap = new Map<string, number>();

    // First pass: identify temp IDs and their operations
    operations.forEach((op, index) => {
      if (isTempId(op.entityId)) {
        tempIdMap.set(`${op.entityType}_${op.entityId}`, index);
      }
    });

    // Second pass: build dependency graph
    operations.forEach((op, index) => {
      const dependencies: number[] = [];
      const dependents: number[] = [];

      // Check if this operation depends on temp entities
      if (op.relationships) {
        Object.entries(op.relationships).forEach(([key, value]) => {
          if (value && isTempId(value)) {
            // Find the operation that creates this temp entity
            const entityType = key.replace('Id', '') + 's'; // petId -> pets
            const depKey = `${entityType}_${value}`;
            const depIndex = tempIdMap.get(depKey);
            
            if (depIndex !== undefined && depIndex !== index) {
              dependencies.push(depIndex);
            }
          }
        });
      }

      nodes.push({
        operation: op,
        dependencies,
        dependents,
        depth: 0,
      });
    });

    // Third pass: calculate dependents
    nodes.forEach((node, index) => {
      node.dependencies.forEach((depIndex) => {
        if (nodes[depIndex]) {
          nodes[depIndex].dependents.push(index);
        }
      });
    });

    // Fourth pass: calculate depth for topological sort
    this.calculateDepth(nodes);

    return nodes;
  }

  /**
   * Sort operations by dependencies (topological sort)
   */
  sortOperations(operations: SyncOperation[]): SyncOperation[] {
    if (operations.length === 0) return [];

    const graph = this.buildDependencyGraphSync(operations);
    const sorted: SyncOperation[] = [];
    const visited = new Set<number>();

    // Sort by depth first
    const nodesByDepth = [...graph].sort((a, b) => a.depth - b.depth);

    // Visit nodes in depth order
    const visit = (nodeIndex: number) => {
      if (visited.has(nodeIndex)) return;
      visited.add(nodeIndex);

      const node = graph[nodeIndex];
      
      // Visit dependencies first
      node.dependencies.forEach((depIndex) => {
        if (!visited.has(depIndex)) {
          visit(depIndex);
        }
      });

      sorted.push(node.operation);
    };

    nodesByDepth.forEach((_, index) => {
      visit(index);
    });

    return sorted;
  }

  /**
   * Get next batch of operations ready to sync
   */
  async getNextBatch(batchSize: number = 50): Promise<SyncOperation[]> {
    const pending = await this.getPending();
    
    if (pending.length === 0) {
      return [];
    }

    // Sort by dependencies
    const sorted = this.sortOperations(pending);

    // Return first batch
    return sorted.slice(0, batchSize);
  }

  /**
   * Retry failed operations
   */
  async retryFailed(): Promise<number> {
    const context = await getOfflineTenantContext();
    if (!context) {
      return 0;
    }

    const failed = await syncQueueStorage.getFailedOperations(context.tenantId);
    let retried = 0;

    // Retry ALL failed operations, no retry limit check
    for (const operation of failed) {
      if (operation.id) {
        await syncQueueStorage.retryOperation(operation.id);
        retried++;
      }
    }

    return retried;
  }

  /**
   * Clear completed operations
   */
  async clearCompleted(): Promise<number> {
    const context = await getOfflineTenantContext();
    if (!context) {
      return 0;
    }

    return syncQueueStorage.clearCompletedOperations(context.tenantId);
  }

  /**
   * Get failed operations
   */
  async getFailed(): Promise<SyncOperation[]> {
    const context = await getOfflineTenantContext();
    if (!context) {
      return [];
    }

    return syncQueueStorage.getFailedOperations(context.tenantId);
  }

  /**
   * Get conflicted operations
   */
  async getConflicted(): Promise<SyncOperation[]> {
    const context = await getOfflineTenantContext();
    if (!context) {
      return [];
    }

    return syncQueueStorage.getConflictedOperations(context.tenantId);
  }

  /**
   * Update operation priority
   */
  async updatePriority(
    operationId: number,
    priority: SyncPriority
  ): Promise<void> {
    await syncQueueStorage.updateOperationPriority(operationId, priority);
  }

  /**
   * Remove operation
   */
  async removeOperation(operationId: number): Promise<void> {
    await syncQueueStorage.removeOperation(operationId);
  }

  /**
   * Clear all operations
   */
  async clearAll(): Promise<void> {
    const context = await getOfflineTenantContext();
    if (!context) {
      return;
    }

    await syncQueueStorage.clearAllOperations(context.tenantId);
  }

  /**
   * Helper: Extract relationships from data
   */
  private extractRelationships(data: any): Record<string, number | string | null> {
    if (!data) return {};

    const relationships: Record<string, number | string | null> = {};
    const relationshipKeys = [
      'petId',
      'clientId',
      'appointmentId',
      'practitionerId',
      'invoiceId',
      'prescriptionId',
      'ownerId',
    ];

    relationshipKeys.forEach((key) => {
      if (key in data) {
        relationships[key] = data[key];
      }
    });

    return relationships;
  }

  /**
   * Helper: Calculate depth for each node
   */
  private calculateDepth(nodes: DependencyNode[]): void {
    const calculateNodeDepth = (index: number, visited: Set<number> = new Set()): number => {
      if (visited.has(index)) {
        return 0; // Circular dependency, treat as depth 0
      }

      visited.add(index);
      const node = nodes[index];

      if (node.dependencies.length === 0) {
        node.depth = 0;
        return 0;
      }

      const maxDepth = Math.max(
        ...node.dependencies.map((depIndex) => 
          calculateNodeDepth(depIndex, new Set(visited))
        )
      );

      node.depth = maxDepth + 1;
      return node.depth;
    };

    nodes.forEach((_, index) => {
      calculateNodeDepth(index);
    });
  }

  /**
   * Helper: Synchronous version of buildDependencyGraph for sorting
   */
  private buildDependencyGraphSync(operations: SyncOperation[]): DependencyNode[] {
    const nodes: DependencyNode[] = [];
    const tempIdMap = new Map<string, number>();

    operations.forEach((op, index) => {
      if (isTempId(op.entityId)) {
        tempIdMap.set(`${op.entityType}_${op.entityId}`, index);
      }
    });

    operations.forEach((op, index) => {
      const dependencies: number[] = [];

      if (op.relationships) {
        Object.entries(op.relationships).forEach(([key, value]) => {
          if (value && isTempId(value)) {
            const entityType = key.replace('Id', '') + 's';
            const depKey = `${entityType}_${value}`;
            const depIndex = tempIdMap.get(depKey);
            
            if (depIndex !== undefined && depIndex !== index) {
              dependencies.push(depIndex);
            }
          }
        });
      }

      nodes.push({
        operation: op,
        dependencies,
        dependents: [],
        depth: 0,
      });
    });

    nodes.forEach((node, index) => {
      node.dependencies.forEach((depIndex) => {
        if (nodes[depIndex]) {
          nodes[depIndex].dependents.push(index);
        }
      });
    });

    this.calculateDepth(nodes);

    return nodes;
  }

  /**
   * Approve an appointment request (offline-first)
   */
  async approveAppointmentRequest(appointmentId: number | string): Promise<number> {
    const context = await getOfflineTenantContext();
    if (!context) {
      throw new Error('No tenant context available');
    }

    // Update local appointment status immediately
    await entityStorage.updateEntity('appointments', appointmentId, {
      status: 'approved',
      updatedAt: new Date().toISOString(),
    } as any, 'pending');

    // Queue sync operation - use 'update' operation type
    return syncQueueStorage.queueOperation({
      tenantId: context.tenantId,
      practiceId: context.practiceId,
      userId: context.userId,
      entityType: 'appointments',
      entityId: appointmentId,
      operation: 'update', // Changed from 'approve' to 'update'
      data: { status: 'approved' },
      relationships: {},
      priority: 'high', // High priority for user actions
      maxRetries: Infinity,
      requiredPermissions: ['appointments:approve'],
      version: 1,
    });
  }

  /**
   * Reject an appointment request (offline-first)
   */
  async rejectAppointmentRequest(appointmentId: number | string, rejectionReason: string): Promise<number> {
    const context = await getOfflineTenantContext();
    if (!context) {
      throw new Error('No tenant context available');
    }

    // Update local appointment status immediately
    await entityStorage.updateEntity('appointments', appointmentId, {
      status: 'rejected',
      description: `REJECTED: ${rejectionReason}`,
      updatedAt: new Date().toISOString(),
    } as any, 'pending');

    // Queue sync operation - use 'update' operation type
    return syncQueueStorage.queueOperation({
      tenantId: context.tenantId,
      practiceId: context.practiceId,
      userId: context.userId,
      entityType: 'appointments',
      entityId: appointmentId,
      operation: 'update', // Changed from 'reject' to 'update'
      data: { status: 'rejected', rejectionReason },
      relationships: {},
      priority: 'high', // High priority for user actions
      maxRetries: Infinity,
      requiredPermissions: ['appointments:reject'],
      version: 1,
    });
  }
}

// Export singleton instance
export const syncQueueManager = new SyncQueueManager();

// Export methods for direct use
export const {
  addOperation,
  getPending,
  getStats,
  getNextBatch,
  retryFailed,
  clearCompleted,
  approveAppointmentRequest,
  rejectAppointmentRequest,
} = syncQueueManager;
