/**
 * Relationship Manager
 * 
 * Manages entity relationships, dependency tracking, and topological sorting.
 * Ensures sync operations execute in the correct order to maintain referential integrity.
 */

import type { SyncOperation } from '../types/sync.types';
import type {
  DependencyNode,
  DependencyGraph,
  RelationshipMap,
  ValidationResult,
  OrphanedEntity,
  IntegrityReport
} from '../types/sync-engine.types';
import { extractRelationships, isTempId } from '../utils/diff-utils';
import { extractTempIds } from './temp-id-resolver';

/**
 * Extract relationships from entity data
 */
export function extractEntityRelationships(
  entityType: string,
  data: any
): RelationshipMap {
  return extractRelationships(data);
}

/**
 * Build dependency graph from sync operations
 */
export function buildDependencyGraph(operations: SyncOperation[]): DependencyGraph {
  const nodes = new Map<string, DependencyNode>();
  
  // Create nodes for each operation
  for (const operation of operations) {
    const nodeId = `${operation.entityType}_${operation.entityId}`;
    nodes.set(nodeId, {
      operation,
      dependencies: [],
      dependents: [],
      depth: 0
    });
  }
  
  // Build dependency relationships
  for (const operation of operations) {
    const nodeId = `${operation.entityType}_${operation.entityId}`;
    const node = nodes.get(nodeId);
    if (!node) continue;
    
    // Extract temp IDs from operation data
    const tempIds = extractTempIds(operation.data);
    
    // Find operations that this depends on
    for (const tempId of tempIds) {
      for (const [otherNodeId, otherNode] of nodes.entries()) {
        if (otherNodeId !== nodeId && otherNode.operation.entityId === tempId) {
          node.dependencies.push(otherNodeId);
          otherNode.dependents.push(nodeId);
        }
      }
    }
  }
  
  // Calculate depths (topological levels)
  calculateDepths(nodes);
  
  // Perform topological sort
  const sortedOperations = topologicalSort(nodes);
  
  // Detect cycles
  const cycles = detectCycles(nodes);
  
  return {
    nodes,
    sortedOperations,
    cycles
  };
}

/**
 * Calculate depth for each node (level in dependency tree)
 */
function calculateDepths(nodes: Map<string, DependencyNode>): void {
  const visited = new Set<string>();
  
  function visit(nodeId: string, depth: number = 0): void {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    const node = nodes.get(nodeId);
    if (!node) return;
    
    node.depth = Math.max(node.depth, depth);
    
    for (const dependentId of node.dependents) {
      visit(dependentId, depth + 1);
    }
  }
  
  // Start from nodes with no dependencies (roots)
  for (const [nodeId, node] of nodes.entries()) {
    if (node.dependencies.length === 0) {
      visit(nodeId, 0);
    }
  }
}

/**
 * Topological sort using Kahn's algorithm
 * Returns operations in dependency order (dependencies first)
 */
export function topologicalSort(
  nodes: Map<string, DependencyNode>
): SyncOperation[] {
  const sorted: SyncOperation[] = [];
  const inDegree = new Map<string, number>();
  const queue: string[] = [];
  
  // Calculate in-degrees
  for (const [nodeId, node] of nodes.entries()) {
    inDegree.set(nodeId, node.dependencies.length);
    if (node.dependencies.length === 0) {
      queue.push(nodeId);
    }
  }
  
  // Process queue
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = nodes.get(nodeId);
    if (!node) continue;
    
    sorted.push(node.operation);
    
    // Reduce in-degree for dependents
    for (const dependentId of node.dependents) {
      const currentDegree = inDegree.get(dependentId) || 0;
      const newDegree = currentDegree - 1;
      inDegree.set(dependentId, newDegree);
      
      if (newDegree === 0) {
        queue.push(dependentId);
      }
    }
  }
  
  return sorted;
}

/**
 * Detect circular dependencies
 */
function detectCycles(nodes: Map<string, DependencyNode>): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const currentPath: string[] = [];
  
  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    currentPath.push(nodeId);
    
    const node = nodes.get(nodeId);
    if (!node) return false;
    
    for (const depId of node.dependencies) {
      if (!visited.has(depId)) {
        if (dfs(depId)) return true;
      } else if (recursionStack.has(depId)) {
        // Found a cycle
        const cycleStart = currentPath.indexOf(depId);
        const cycle = currentPath.slice(cycleStart);
        cycles.push(cycle);
        return true;
      }
    }
    
    recursionStack.delete(nodeId);
    currentPath.pop();
    return false;
  }
  
  for (const nodeId of nodes.keys()) {
    if (!visited.has(nodeId)) {
      dfs(nodeId);
    }
  }
  
  return cycles;
}

/**
 * Validate entity relationships
 */
export function validateRelationships(entity: any): ValidationResult {
  const errors: any[] = [];
  const warnings: any[] = [];
  
  const relationships = extractRelationships(entity);
  
  // Check for required relationships based on entity type
  const requiredFields: Record<string, string[]> = {
    appointment: ['clientId', 'petId'],
    soapNote: ['appointmentId'],
    invoice: ['clientId'],
    prescription: ['petId']
  };
  
  const required = requiredFields[entity.type] || [];
  for (const field of required) {
    if (!relationships[field]) {
      errors.push({
        field,
        value: null,
        message: `Required relationship ${field} is missing`,
        severity: 'error'
      });
    }
  }
  
  // Warn about temp IDs
  for (const [field, value] of Object.entries(relationships)) {
    if (isTempId(value)) {
      warnings.push({
        field,
        value,
        message: `Relationship ${field} uses temporary ID`,
        suggestion: 'Ensure dependency is synced first'
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Find orphaned entities (missing parent references)
 */
export async function findOrphanedEntities(
  entities: any[]
): Promise<OrphanedEntity[]> {
  const orphans: OrphanedEntity[] = [];
  
  for (const entity of entities) {
    const relationships = extractRelationships(entity);
    
    for (const [field, value] of Object.entries(relationships)) {
      if (!value) continue;
      
      // Check if referenced entity exists
      const refEntityType = field.replace('Id', '');
      const referenced = entities.find(
        e => e.type === refEntityType && e.id === value
      );
      
      if (!referenced && !isTempId(value)) {
        orphans.push({
          id: entity.id,
          entityType: entity.type,
          missingReference: field,
          missingId: value,
          data: entity,
          detectedAt: Date.now()
        });
      }
    }
  }
  
  return orphans;
}

/**
 * Check referential integrity across all entities
 */
export async function checkReferentialIntegrity(
  entities: any[]
): Promise<IntegrityReport> {
  const orphanedEntities = await findOrphanedEntities(entities);
  const brokenReferences: any[] = [];
  const circularReferences: any[] = [];
  
  // Build entity map for quick lookups
  const entityMap = new Map<string, any>();
  for (const entity of entities) {
    const key = `${entity.type}_${entity.id}`;
    entityMap.set(key, entity);
  }
  
  // Check for broken references
  for (const entity of entities) {
    const relationships = extractRelationships(entity);
    
    for (const [field, value] of Object.entries(relationships)) {
      if (!value || isTempId(value)) continue;
      
      const refType = field.replace('Id', '');
      const refKey = `${refType}_${value}`;
      
      if (!entityMap.has(refKey)) {
        brokenReferences.push({
          sourceEntityType: entity.type,
          sourceEntityId: entity.id,
          field,
          targetEntityType: refType,
          targetEntityId: value
        });
      }
    }
  }
  
  return {
    valid: orphanedEntities.length === 0 && brokenReferences.length === 0,
    totalEntities: entities.length,
    orphanedEntities,
    brokenReferences,
    circularReferences
  };
}

/**
 * Resolve orphaned entities
 */
export async function resolveOrphans(
  orphans: OrphanedEntity[],
  strategy: 'delete' | 'keep' | 'queue'
): Promise<void> {
  for (const orphan of orphans) {
    switch (strategy) {
      case 'delete':
        console.log(`🗑️ Deleting orphaned ${orphan.entityType} ${orphan.id}`);
        // Delete logic would go here
        break;
      
      case 'keep':
        console.log(`⚠️ Keeping orphaned ${orphan.entityType} ${orphan.id}`);
        // Just log, no action
        break;
      
      case 'queue':
        console.log(`📋 Queuing orphaned ${orphan.entityType} ${orphan.id} for review`);
        // Queue for manual review
        break;
    }
  }
}

/**
 * Get sync order for entity types based on typical relationships
 */
export function getTypicalSyncOrder(): string[] {
  return [
    'practitioner',
    'client',
    'pet',
    'appointment',
    'soapNote',
    'prescription',
    'labResult',
    'vaccination',
    'medicalRecord',
    'invoice',
    'invoiceItem',
    'payment'
  ];
}

/**
 * Sort operations by entity type dependency order
 */
export function sortByEntityTypeDependency(
  operations: SyncOperation[]
): SyncOperation[] {
  const order = getTypicalSyncOrder();
  
  return operations.sort((a, b) => {
    const aIndex = order.indexOf(a.entityType);
    const bIndex = order.indexOf(b.entityType);
    
    // Unknown types go last
    const aOrder = aIndex === -1 ? 999 : aIndex;
    const bOrder = bIndex === -1 ? 999 : bIndex;
    
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    
    // Same type: sort by timestamp
    return a.timestamp - b.timestamp;
  });
}

/**
 * Group operations by dependency level
 */
export function groupByDependencyLevel(
  operations: SyncOperation[]
): SyncOperation[][] {
  const graph = buildDependencyGraph(operations);
  const levels: SyncOperation[][] = [];
  
  // Group by depth
  const depthMap = new Map<number, SyncOperation[]>();
  for (const node of graph.nodes.values()) {
    const ops = depthMap.get(node.depth) || [];
    ops.push(node.operation);
    depthMap.set(node.depth, ops);
  }
  
  // Convert to array of arrays
  const maxDepth = Math.max(...Array.from(depthMap.keys()));
  for (let i = 0; i <= maxDepth; i++) {
    levels.push(depthMap.get(i) || []);
  }
  
  return levels;
}

/**
 * Check if operation has unresolved dependencies
 */
export function hasUnresolvedDependencies(
  operation: SyncOperation,
  completedOperations: Set<string>
): boolean {
  const tempIds = extractTempIds(operation.data);
  
  for (const tempId of tempIds) {
    const depKey = `${operation.entityType}_${tempId}`;
    if (!completedOperations.has(depKey)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get dependency count for an operation
 */
export function getDependencyCount(operation: SyncOperation): number {
  return extractTempIds(operation.data).length;
}

/**
 * Visualize dependency graph (for debugging)
 */
export function visualizeDependencyGraph(graph: DependencyGraph): string {
  const lines: string[] = [];
  lines.push('Dependency Graph:');
  lines.push('================');
  
  // Sort by depth
  const nodesByDepth = new Map<number, DependencyNode[]>();
  for (const node of graph.nodes.values()) {
    const nodes = nodesByDepth.get(node.depth) || [];
    nodes.push(node);
    nodesByDepth.set(node.depth, nodes);
  }
  
  const maxDepth = Math.max(...Array.from(nodesByDepth.keys()));
  for (let depth = 0; depth <= maxDepth; depth++) {
    const nodes = nodesByDepth.get(depth) || [];
    lines.push(`\nLevel ${depth}:`);
    for (const node of nodes) {
      const indent = '  '.repeat(depth);
      lines.push(`${indent}${node.operation.entityType} ${node.operation.entityId}`);
      if (node.dependencies.length > 0) {
        lines.push(`${indent}  depends on: ${node.dependencies.join(', ')}`);
      }
    }
  }
  
  if (graph.cycles.length > 0) {
    lines.push('\n⚠️ Circular Dependencies Detected:');
    for (const cycle of graph.cycles) {
      lines.push(`  ${cycle.join(' → ')} → ${cycle[0]}`);
    }
  }
  
  return lines.join('\n');
}
