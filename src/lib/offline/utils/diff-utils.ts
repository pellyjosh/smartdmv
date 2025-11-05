/**
 * Diff Utilities
 * Deep object comparison and field-level diff generation for conflict detection
 */

import type { FieldDiff, DiffType, MergeResult } from '../types/sync-engine.types';

/**
 * Deep equality check for objects
 */
export function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }
  
  return true;
}

/**
 * Generate a hash for an object
 */
export function hashObject(obj: any): string {
  const str = JSON.stringify(obj, Object.keys(obj).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * Compare two objects and generate field-level diffs
 */
export function generateFieldDiffs(localData: any, serverData: any): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  const allKeys = new Set([
    ...Object.keys(localData || {}),
    ...Object.keys(serverData || {})
  ]);
  
  for (const field of allKeys) {
    const localValue = localData?.[field];
    const serverValue = serverData?.[field];
    const type = getDiffType(localValue, serverValue);
    const conflicting = type === 'modified';
    
    if (type !== 'unchanged') {
      diffs.push({
        field,
        localValue,
        serverValue,
        type,
        conflicting
      });
    }
  }
  
  return diffs;
}

/**
 * Determine diff type for a field
 */
function getDiffType(localValue: any, serverValue: any): DiffType {
  const localExists = localValue !== undefined && localValue !== null;
  const serverExists = serverValue !== undefined && serverValue !== null;
  
  if (!localExists && serverExists) return 'removed';
  if (localExists && !serverExists) return 'added';
  if (!localExists && !serverExists) return 'unchanged';
  
  return deepEqual(localValue, serverValue) ? 'unchanged' : 'modified';
}

/**
 * Attempt intelligent merge of two objects
 */
export function attemptMerge(localData: any, serverData: any): MergeResult {
  const diffs = generateFieldDiffs(localData, serverData);
  const conflicting = diffs.filter(d => d.conflicting);
  
  // Auto-resolve non-conflicting changes
  const merged = { ...serverData };
  const autoResolved: string[] = [];
  const manualRequired: string[] = [];
  
  for (const diff of diffs) {
    if (!diff.conflicting) {
      // Non-conflicting: take whichever exists or is newer
      if (diff.type === 'added') {
        merged[diff.field] = diff.localValue;
        autoResolved.push(diff.field);
      } else if (diff.type === 'removed') {
        delete merged[diff.field];
        autoResolved.push(diff.field);
      }
    } else {
      // Conflicting: requires manual resolution
      manualRequired.push(diff.field);
    }
  }
  
  return {
    success: manualRequired.length === 0,
    mergedData: merged,
    conflicts: conflicting,
    autoResolved,
    manualRequired
  };
}

/**
 * Merge with a specified strategy for each field
 */
export function mergeWithStrategy(
  localData: any,
  serverData: any,
  fieldStrategy: Record<string, 'local' | 'server'>
): any {
  const merged = { ...serverData };
  
  for (const [field, strategy] of Object.entries(fieldStrategy)) {
    if (strategy === 'local' && localData[field] !== undefined) {
      merged[field] = localData[field];
    }
  }
  
  return merged;
}

/**
 * Check if changes are only in metadata fields
 */
export function isOnlyMetadataChanged(diffs: FieldDiff[], metadataFields: string[] = [
  'lastModified', 'updatedAt', 'version', 'serverVersion', 'syncedAt'
]): boolean {
  const nonMetadataDiffs = diffs.filter(d => !metadataFields.includes(d.field));
  return nonMetadataDiffs.length === 0;
}

/**
 * Get fields that changed
 */
export function getChangedFields(localData: any, serverData: any): string[] {
  const diffs = generateFieldDiffs(localData, serverData);
  return diffs.filter(d => d.type !== 'unchanged').map(d => d.field);
}

/**
 * Check if two timestamps indicate concurrent edits
 */
export function areConcurrentEdits(
  localTimestamp: number,
  serverTimestamp: number,
  thresholdMs: number = 5000
): boolean {
  return Math.abs(localTimestamp - serverTimestamp) < thresholdMs;
}

/**
 * Determine conflict severity based on changed fields
 */
export function determineConflictSeverity(
  diffs: FieldDiff[],
  criticalFields: string[] = ['id', 'clientId', 'petId', 'appointmentId']
): 'low' | 'medium' | 'high' | 'critical' {
  const changedFields = diffs.map(d => d.field);
  const conflictingFields = diffs.filter(d => d.conflicting).map(d => d.field);
  
  // Critical if critical fields are conflicting
  if (conflictingFields.some(f => criticalFields.includes(f))) {
    return 'critical';
  }
  
  // High if many fields are conflicting
  if (conflictingFields.length > 5) {
    return 'high';
  }
  
  // Medium if some fields are conflicting
  if (conflictingFields.length > 0) {
    return 'medium';
  }
  
  // Low if only metadata changed
  return 'low';
}

/**
 * Create a visual diff string for display
 */
export function createDiffString(diff: FieldDiff): string {
  const symbols = {
    added: '+ ',
    removed: '- ',
    modified: '~ ',
    unchanged: '  '
  };
  
  const symbol = symbols[diff.type];
  const value = diff.type === 'removed' ? diff.serverValue : diff.localValue;
  
  return `${symbol}${diff.field}: ${JSON.stringify(value)}`;
}

/**
 * Format all diffs as a readable string
 */
export function formatDiffs(diffs: FieldDiff[]): string {
  return diffs.map(createDiffString).join('\n');
}

/**
 * Extract relationships from data
 */
export function extractRelationships(data: any): Record<string, any> {
  const relationshipFields = [
    'clientId', 'petId', 'appointmentId', 'practitionerId', 
    'userId', 'practiceId', 'invoiceId', 'medicalRecordId'
  ];
  
  const relationships: Record<string, any> = {};
  for (const field of relationshipFields) {
    if (data[field] !== undefined && data[field] !== null) {
      relationships[field] = data[field];
    }
  }
  
  return relationships;
}

/**
 * Check if an ID is a temp ID
 */
export function isTempId(id: string | number): boolean {
  return typeof id === 'string' && id.startsWith('temp_');
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;
  
  const cloned = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}
