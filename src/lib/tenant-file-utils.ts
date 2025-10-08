/**
 * Client-side tenant file utilities - no server dependencies
 */

/**
 * Client-side function to construct tenant-specific file URLs
 * @param filePath The stored file path from the database
 * @param tenantId The tenant ID from client context
 * @param pathSegments Additional path segments for the tenant-specific structure
 * @returns The correct URL to access the file
 */
export function getTenantFileUrlClient(
  filePath: string | null | undefined,
  tenantId: string,
  ...pathSegments: string[]
): string | null {
  if (!filePath || !tenantId) return null;

  // If the path already starts with /api/files/ (new format), use it as-is
  if (filePath.startsWith('/api/files/')) {
    return filePath;
  }
  
  // If it's an old format path (/uploads/...), convert to new format
  if (filePath.startsWith('/uploads/')) {
    // For existing public/uploads structure, just return the path as-is
    // This handles paths like: /uploads/Smart Vett/1/pets/2/filename.png
    return filePath;
  }
  
  // If it's a relative path without leading slash, treat as old format
  if (!filePath.startsWith('/')) {
    // Try to construct the old public uploads path first
    const filename = filePath.split('/').pop();
    if (filename && pathSegments.length >= 3) {
      // pathSegments should be ['practices', practiceId, 'pets', clientId]
      const practiceId = pathSegments[1];
      const clientId = pathSegments[3];
      
      // Map tenant ID to proper tenant name for file path
      const tenantName = getTenantDisplayName(tenantId);
      return `/uploads/${tenantName}/${practiceId}/pets/${clientId}/${filename}`;
    }
    
    return `/api/files/${tenantId}/${pathSegments.join('/')}/${filename}`;
  }
  
  // Fallback: try to construct new path
  const filename = filePath.split('/').pop();
  if (!filename) return null;
  
  return `/api/files/${tenantId}/${pathSegments.join('/')}/${filename}`;
}

/**
 * Maps tenant IDs to proper display names for file paths
 */
function getTenantDisplayName(tenantId: string): string {
  // Map common tenant IDs to their proper display names
  const tenantMapping: Record<string, string> = {
    'smartvett': 'Smart Vett',
    'smartvet': 'Smart Vett',
    'default': 'Default',
    // Add more mappings as needed
  };
  
  return tenantMapping[tenantId.toLowerCase()] || tenantId;
}

/**
 * Specialized helper for pet images - handles existing public uploads structure
 */
export function getPetImageUrlClient(
  photoPath: string | null | undefined,
  tenantId: string,
  practiceId: string,
  clientId: string
): string | null {
  if (!photoPath || !tenantId) return null;

  // If the path already starts with /api/files/ or /uploads/, use it as-is
  if (photoPath.startsWith('/api/files/') || photoPath.startsWith('/uploads/')) {
    return photoPath;
  }
  
  // If it's just a filename, construct the public uploads path
  if (!photoPath.includes('/')) {
    const tenantName = getTenantDisplayName(tenantId);
    return `/uploads/${tenantName}/${practiceId}/pets/${clientId}/${photoPath}`;
  }
  
  // If it's a relative path, try to construct the public uploads path
  const filename = photoPath.split('/').pop();
  if (filename) {
    const tenantName = getTenantDisplayName(tenantId);
    return `/uploads/${tenantName}/${practiceId}/pets/${clientId}/${filename}`;
  }
  
  return getTenantFileUrlClient(photoPath, tenantId, 'practices', practiceId, 'pets', clientId);
}

/**
 * Specialized helper for medical record attachments
 */
export function getMedicalAttachmentUrlClient(
  filePath: string | null | undefined,
  tenantId: string,
  practiceId: string,
  recordType: string,
  recordId: string
): string | null {
  return getTenantFileUrlClient(filePath, tenantId, 'practices', practiceId, 'medical-records', recordType, recordId);
}

/**
 * Specialized helper for general practice files
 */
export function getPracticeFileUrlClient(
  filePath: string | null | undefined,
  tenantId: string,
  practiceId: string,
  category: string
): string | null {
  return getTenantFileUrlClient(filePath, tenantId, 'practices', practiceId, category);
}