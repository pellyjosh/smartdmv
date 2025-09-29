// Utility for creating audit log entries
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { auditLogs, type NewAuditLog } from '@/db/schema';

// Standardized fallbacks used across the app for audit logging when no user context is available
export const SYSTEM_USER_ID = 'system';
export const SYSTEM_USER_NAME = 'System';

export type AuditAction = 
  | 'CREATE'
  | 'UPDATE' 
  | 'DELETE'
  | 'VIEW'
  | 'LOCK'
  | 'UNLOCK'
  | 'ASSIGN'
  | 'UNASSIGN'
  | 'APPROVE'
  | 'REJECT';

export type AuditRecordType = 
  | 'USER'
  | 'ROLE'
  | 'PERMISSION'
  | 'PERMISSION_OVERRIDE'
  | 'USER_ROLE_ASSIGNMENT'
  | 'SOAP_NOTE'
  | 'LAB_RESULT'
  | 'PRESCRIPTION'
  | 'VACCINATION'
  | 'TREATMENT'
  | 'HEALTH_PLAN'
  | 'APPOINTMENT'
  | 'PET'
  | 'CLIENT'
  | 'PRACTICE'
  | 'INVENTORY'
  | 'BILLING';

export interface CreateAuditLogParams {
  action: AuditAction;
  recordType: AuditRecordType;
  recordId?: string;
  description?: string;
  userId?: string;
  practiceId?: string;
  organizationId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  reason?: string;
}

/**
 * Creates an audit log entry
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    // Get the tenant-specific database
    const db = await getCurrentTenantDb();
    
    // Normalize action and recordType safely even if caller passed undefined/null
    const normalizedAction = (params.action || 'UNKNOWN').toString().toUpperCase();
    const normalizedRecordType = (params.recordType || 'UNKNOWN').toString().toUpperCase();

    // sanitize metadata and changes so Dates or objects with toISOString don't break DB serialization
    const sanitizeForAudit = (input: any): any => {
      if (input === undefined || input === null) return input;
      if (input instanceof Date) return input.toISOString();
      const t = typeof input;
      if (t === 'string' || t === 'number' || t === 'boolean') return input;
      if (Array.isArray(input)) {
        return input.map(item => {
          try {
            return sanitizeForAudit(item);
          } catch (e) {
            return String(item);
          }
        });
      }
      if (t === 'object') {
        try {
          // if it's an object with a toISOString method, try to use it safely
          if (typeof (input as any).toISOString === 'function') {
            try {
              const iso = (input as any).toISOString();
              return iso;
            } catch (e) {
              // fallthrough to object traversal
            }
          }
          const out: any = {};
          for (const k of Object.keys(input)) {
            try {
              out[k] = sanitizeForAudit((input as any)[k]);
            } catch (e) {
              out[k] = String((input as any)[k]);
            }
          }
          return out;
        } catch (e) {
          return String(input);
        }
      }
      return String(input);
    };

    const auditLogData: NewAuditLog = {
      action: normalizedAction,
      recordType: normalizedRecordType,
      recordId: params.recordId,
      description: params.description || `${params.action} ${params.recordType}${params.recordId ? ` (ID: ${params.recordId})` : ''}`,
      userId: params.userId,
      practiceId: params.practiceId,
      organizationId: params.organizationId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: sanitizeForAudit(params.metadata),
      changes: params.changes
        ? {
            before: sanitizeForAudit(params.changes.before),
            after: sanitizeForAudit(params.changes.after),
          }
        : undefined,
      reason: params.reason,
    };

    await db.insert(auditLogs).values(auditLogData);
  } catch (error) {
    // Log the error but don't throw it to avoid breaking the main application flow
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Helper function to extract IP address from request headers
 */
export function getClientIpAddress(headers: Headers): string | undefined {
  const xForwardedFor = headers.get('x-forwarded-for');
  const xRealIp = headers.get('x-real-ip');
  const cfConnectingIp = headers.get('cf-connecting-ip');
  
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  
  if (xRealIp) {
    return xRealIp;
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  return undefined;
}

/**
 * Creates an audit log from an API request
 */
export async function createAuditLogFromRequest(
  request: Request,
  params: Omit<CreateAuditLogParams, 'ipAddress' | 'userAgent'>
): Promise<void> {
  const headers = request.headers;
  const ipAddress = getClientIpAddress(headers);
  const userAgent = headers.get('user-agent') || undefined;

  return createAuditLog({
    ...params,
    ipAddress,
    userAgent,
  });
}

/**
 * Batch create multiple audit logs
 */
export async function createAuditLogsBatch(logs: CreateAuditLogParams[]): Promise<void> {
  try {
    // Get the tenant-specific database
    const db = await getCurrentTenantDb();
    
    const sanitizeForAudit = (input: any): any => {
      if (input === undefined || input === null) return input;
      if (input instanceof Date) return input.toISOString();
      const t = typeof input;
      if (t === 'string' || t === 'number' || t === 'boolean') return input;
      if (Array.isArray(input)) {
        return input.map(item => {
          try {
            return sanitizeForAudit(item);
          } catch (e) {
            return String(item);
          }
        });
      }
      if (t === 'object') {
        try {
          if (typeof (input as any).toISOString === 'function') {
            try {
              return (input as any).toISOString();
            } catch (e) {}
          }
          const out: any = {};
          for (const k of Object.keys(input)) {
            try {
              out[k] = sanitizeForAudit((input as any)[k]);
            } catch (e) {
              out[k] = String((input as any)[k]);
            }
          }
          return out;
        } catch (e) {
          return String(input);
        }
      }
      return String(input);
    };

    const auditLogDataArray: NewAuditLog[] = logs.map(params => ({
      action: params.action.toUpperCase(),
      recordType: params.recordType.toUpperCase(),
      recordId: params.recordId,
      description: params.description || `${params.action} ${params.recordType}${params.recordId ? ` (ID: ${params.recordId})` : ''}`,
      userId: params.userId,
      practiceId: params.practiceId,
      organizationId: params.organizationId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: sanitizeForAudit(params.metadata),
      changes: params.changes
        ? {
            before: sanitizeForAudit(params.changes.before),
            after: sanitizeForAudit(params.changes.after),
          }
        : undefined,
      reason: params.reason,
    }));

    await db.insert(auditLogs).values(auditLogDataArray);
  } catch (error) {
    // Log the error but don't throw it to avoid breaking the main application flow
    console.error('Failed to create audit logs batch:', error);
  }
}

/**
 * Convenience helper for CREATE operations
 */
export async function logCreate(
  request: Request,
  recordType: AuditRecordType,
  recordId: string,
  data: any,
  userId: string,
  practiceId?: string,
  reason?: string,
  metadata?: Record<string, any>
): Promise<void> {
  return createAuditLogFromRequest(request, {
    action: 'CREATE',
    recordType,
    recordId,
    description: `Created ${recordType.toLowerCase().replace('_', ' ')} with ID ${recordId}`,
    userId,
    practiceId,
    reason,
    metadata,
    changes: { after: data }
  });
}

/**
 * Convenience helper for UPDATE operations
 */
export async function logUpdate(
  request: Request,
  recordType: AuditRecordType,
  recordId: string,
  beforeData: any,
  afterData: any,
  userId: string,
  practiceId?: string,
  reason?: string,
  metadata?: Record<string, any>
): Promise<void> {
  return createAuditLogFromRequest(request, {
    action: 'UPDATE',
    recordType,
    recordId,
    description: `Updated ${recordType.toLowerCase().replace('_', ' ')} with ID ${recordId}`,
    userId,
    practiceId,
    reason,
    metadata,
    changes: { before: beforeData, after: afterData }
  });
}

/**
 * Convenience helper for DELETE operations
 */
export async function logDelete(
  request: Request,
  recordType: AuditRecordType,
  recordId: string,
  data: any,
  userId: string,
  practiceId?: string,
  reason?: string,
  metadata?: Record<string, any>
): Promise<void> {
  return createAuditLogFromRequest(request, {
    action: 'DELETE',
    recordType,
    recordId,
    description: `Deleted ${recordType.toLowerCase().replace('_', ' ')} with ID ${recordId}`,
    userId,
    practiceId,
    reason,
    metadata,
    changes: { before: data }
  });
}

/**
 * Convenience helper for VIEW operations (for sensitive data)
 */
export async function logView(
  request: Request,
  recordType: AuditRecordType,
  recordId: string,
  userId: string,
  practiceId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  return createAuditLogFromRequest(request, {
    action: 'VIEW',
    recordType,
    recordId,
    description: `Viewed ${recordType.toLowerCase().replace('_', ' ')} with ID ${recordId}`,
    userId,
    practiceId,
    metadata
  });
}

/**
 * Convenience helper for authentication events
 */
export async function logAuth(
  request: Request,
  action: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT',
  userId: string,
  userEmail: string,
  practiceId?: string,
  reason?: string
): Promise<void> {
  return createAuditLogFromRequest(request, {
    action: action as AuditAction,
    recordType: 'USER',
    recordId: userId,
    description: `${action.replace('_', ' ').toLowerCase()} for user ${userEmail}`,
    userId: action === 'LOGIN_FAILED' ? 'unknown' : userId,
    practiceId,
    reason,
    metadata: { email: userEmail, action }
  });
}

/**
 * Helper to get user info from request/session (you'll need to implement based on your auth)
 */
export interface UserContext {
  userId: string;
  practiceId?: string;
  role?: string;
}

/**
 * Auto-audit wrapper for API route handlers
 * Usage: export const POST = withAudit('USER', 'CREATE', actualPostHandler);
 */
export function withAudit<T extends any[]>(
  recordType: AuditRecordType,
  action: AuditAction,
  handler: (request: Request, ...args: T) => Promise<Response>,
  getUserContext?: (request: Request) => Promise<UserContext | null>
) {
  return async (request: Request, ...args: T): Promise<Response> => {
    const response = await handler(request, ...args);
    
    try {
      const userContext = getUserContext ? await getUserContext(request) : null;
      
      if (userContext && response.ok) {
        // Extract record ID from response if possible
        const responseData = await response.clone().json().catch(() => ({}));
        const recordId = responseData.id || responseData.recordId || 'unknown';
        
        await createAuditLogFromRequest(request, {
          action,
          recordType,
          recordId: recordId.toString(),
          userId: userContext.userId,
          practiceId: userContext.practiceId,
          metadata: { 
            statusCode: response.status,
            method: request.method,
            url: request.url
          }
        });
      }
    } catch (error) {
      console.error('Failed to create audit log in wrapper:', error);
    }
    
    return response;
  };
}
