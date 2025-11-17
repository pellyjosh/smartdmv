/**
 * Relationship Manager
 * 
 * Provides entity type ordering for sync operations.
 * Ensures operations execute in correct order based on entity relationships.
 */

import type { SyncOperation } from '../types/sync.types';

/**
 * Get sync order for entity types based on typical relationships
 * Parents should sync before children to avoid foreign key violations
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
    'admission',
    'invoice',
    'invoiceItem',
    'payment'
  ];
}

/**
 * Sort operations by entity type dependency order
 * Ensures parent entities (clients) sync before children (pets, appointments)
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
    
    // Same type: sort by timestamp (older first)
    return a.timestamp - b.timestamp;
  });
}

