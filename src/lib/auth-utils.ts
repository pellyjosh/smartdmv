import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getCurrentTenantDb } from "@/lib/tenant-db-resolver"
import { users as usersTable, sessions as sessionsTable, practices as practicesTable, UserRoleEnum } from "@/db/schema"
import { eq } from "drizzle-orm"
import { hasAnyRole } from "./rbac/dynamic-roles"
import { getUserRolePermissions } from "./rbac/utils"
import { HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME } from '@/config/authConstants';
import type { User } from '@/context/UserContext';

export interface UserPracticeInfo {
  userId: string;
  practiceId: string;
  userRole: string;
  email: string;
  user: User;
}

// Server-side version of UserContext getUserPracticeId logic
async function getUserPracticeId(user: any, db: any): Promise<string | undefined> {
  if (!user) return undefined;
  
  if (process.env.DEBUG_AUTH === 'true') {
    console.log(`[AUTH_UTILS getUserPracticeId] Getting practice ID for user: ${user.email}, role: ${user.role}`);
  }
  
  // For SUPER_ADMIN, always use currentPracticeId first, or fallback to practiceId
  if (user.role === 'SUPER_ADMIN') {
    const practiceId = user.currentPracticeId || user.practiceId;
    if (practiceId) {
      if (process.env.DEBUG_AUTH === 'true') {
        console.log(`[AUTH_UTILS getUserPracticeId] SUPER_ADMIN using practice ID: ${practiceId}`);
      }
      return practiceId.toString();
    }
    
    // If neither is set, try to get the first available practice
    try {
      const firstPractice = await db.query.practices.findFirst();
      if (firstPractice) {
        console.log(`[AUTH_UTILS getUserPracticeId] SUPER_ADMIN ${user.email} defaulting to first practice: ${firstPractice.id}`);
        return firstPractice.id.toString();
      }
    } catch (error) {
      console.error('[AUTH_UTILS getUserPracticeId] Error getting first practice:', error);
    }
    
    console.log(`[AUTH_UTILS getUserPracticeId] SUPER_ADMIN ${user.email} has no practices available`);
    return undefined;
  }
  
  // Check if user has practice-specific roles
  const hasPracticeRole = await hasAnyRole(user.role, ['CLIENT', 'PRACTICE_ADMINISTRATOR', 'VETERINARIAN', 'PRACTICE_MANAGER']);
  if (hasPracticeRole) {
    const practiceId = user.practiceId || user.currentPracticeId;
    console.log(`[AUTH_UTILS getUserPracticeId] Practice role user using practice ID: ${practiceId}`);
    return practiceId ? practiceId.toString() : undefined;
  }
  
  // Check if user has other admin roles
  const hasAdminRole = await hasAnyRole(user.role, ['ADMINISTRATOR', 'SUPER_ADMIN']);
  if (hasAdminRole) {
    const practiceId = user.currentPracticeId || user.practiceId;
    console.log(`[AUTH_UTILS getUserPracticeId] Admin role user using practice ID: ${practiceId}`);
    return practiceId ? practiceId.toString() : undefined;
  }
  
  console.log(`[AUTH_UTILS getUserPracticeId] No suitable practice ID found for role: ${user.role}`);
  return undefined;
}

export async function getUserPractice(request: NextRequest): Promise<UserPracticeInfo | null> {
  if (process.env.DEBUG_AUTH === 'true') {
    console.log('[AUTH_UTILS getUserPractice] Starting getUserPractice');
  }
  
  try {
    const cookieStore = await cookies();
    const sessionTokenValue = cookieStore.get(HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME)?.value;

    if (!sessionTokenValue) {
      // Only log for debugging auth issues
      if (process.env.DEBUG_AUTH === 'true') {
        console.log('[AUTH_UTILS getUserPractice] No session token found');
      }
      return null;
    }
    
    if (process.env.DEBUG_AUTH === 'true') {
      console.log('[AUTH_UTILS getUserPractice] Session token found');
    }

    // Use tenant-specific database with retry logic
    let db;
    let session;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (process.env.DEBUG_AUTH === 'true') {
          console.log(`[AUTH_UTILS getUserPractice] DB connection attempt ${attempt}`);
        }
        db = await getCurrentTenantDb();
        
        // Get session with timeout wrapper
        const sessionQuery = db.query.sessions.findFirst({
          where: eq(sessionsTable.id, sessionTokenValue)
        });
        
        session = await Promise.race([
          sessionQuery,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Session query timeout')), 8000)
          )
        ]) as any;
        
        break; // Success, exit retry loop
      } catch (error: any) {
        console.error(`[AUTH_UTILS getUserPractice] DB connection attempt ${attempt} failed:`, error.message);
        
        // Clear tenant cache on connection errors to force fresh connection
        if (error.message.includes('timeout') || error.message.includes('terminated')) {
          const { clearTenantCache } = await import('@/lib/tenant-db-resolver');
          clearTenantCache();
        }
        
        if (attempt === 3) {
          throw error; // Final attempt failed, rethrow
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
      }
    }

    if (!session) {
      if (process.env.DEBUG_AUTH === 'true') {
        console.log('[AUTH_UTILS getUserPractice] Session not found in DB');
      }
      return null;
    }
    
    if (process.env.DEBUG_AUTH === 'true') {
      console.log('[AUTH_UTILS getUserPractice] Session found: YES');
    }

    // Check if session is expired
    const sessionExpiresAt = typeof session.expiresAt === 'number' 
                             ? session.expiresAt 
                             : new Date(session.expiresAt).getTime();
    const currentTime = Date.now();

    if (sessionExpiresAt < currentTime) {
      if (process.env.DEBUG_AUTH === 'true') {
        console.log('[AUTH_UTILS getUserPractice] Session expired');
      }
      return null;
    }
    
    if (process.env.DEBUG_AUTH === 'true') {
      console.log('[AUTH_UTILS getUserPractice] Session is valid, user ID:', session.userId);
    }

    // Get user
    const userRecord = await db.query.users.findFirst({
      where: eq(usersTable.id, session.userId),
    });

    if (!userRecord) {
      if (process.env.DEBUG_AUTH === 'true') {
        console.log('[AUTH_UTILS getUserPractice] User record not found');
      }
      return null;
    }
    
    if (process.env.DEBUG_AUTH === 'true') {
      console.log('[AUTH_UTILS getUserPractice] User record found: YES');
      console.log('[AUTH_UTILS getUserPractice] User details: {');
      console.log('  id:', userRecord.id);
      console.log('  email:', userRecord.email);
      console.log('  role:', userRecord.role);
      console.log('  practiceId:', userRecord.practiceId);
      console.log('  currentPracticeId:', userRecord.currentPracticeId);
      console.log('}');
    }

    // Create User object matching UserContext types
    let userData: User;
    
    if (userRecord.role === 'CLIENT') {
      const permissions = getUserRolePermissions(UserRoleEnum.CLIENT);
      userData = {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        role: 'CLIENT',
        practiceId: userRecord.currentPracticeId || '',
        // Populate a minimal roles array for compatibility with new RBAC
        // helpers that expect `user.roles`.
        // Permissions will be resolved elsewhere if dynamic role data exists.
        roles: [
          { 
            id: `legacy-CLIENT`, 
            name: 'CLIENT', 
            displayName: 'Client', 
            permissions: permissions.map(p => ({
              resource: p.resource,
              action: p.action,
              granted: p.granted
            }))
          }
        ],
      } as any;
    } else if (userRecord.role === 'PRACTICE_ADMINISTRATOR') {
      const permissions = getUserRolePermissions(UserRoleEnum.PRACTICE_ADMINISTRATOR);
      userData = {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        role: 'PRACTICE_ADMINISTRATOR',
        practiceId: userRecord.currentPracticeId || '',
        roles: [
          { 
            id: `legacy-PRACTICE_ADMINISTRATOR`, 
            name: 'PRACTICE_ADMINISTRATOR', 
            displayName: 'Practice Administrator', 
            permissions: permissions.map(p => ({
              resource: p.resource,
              action: p.action,
              granted: p.granted
            }))
          }
        ],
      } as any;
    } else if (userRecord.role === 'VETERINARIAN') {
      const permissions = getUserRolePermissions(UserRoleEnum.VETERINARIAN);
      userData = {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        role: 'VETERINARIAN',
        practiceId: userRecord.currentPracticeId || '',
        roles: [
          { 
            id: `legacy-VETERINARIAN`, 
            name: 'VETERINARIAN', 
            displayName: 'Veterinarian', 
            permissions: permissions.map(p => ({
              resource: p.resource,
              action: p.action,
              granted: p.granted
            }))
          }
        ],
      } as any;
    } else if (userRecord.role === 'PRACTICE_MANAGER') {
      const permissions = getUserRolePermissions(UserRoleEnum.PRACTICE_MANAGER);
      userData = {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        role: 'PRACTICE_MANAGER',
        practiceId: userRecord.currentPracticeId || '',
        roles: [
          { 
            id: `legacy-PRACTICE_MANAGER`, 
            name: 'PRACTICE_MANAGER', 
            displayName: 'Practice Manager', 
            permissions: permissions.map(p => ({
              resource: p.resource,
              action: p.action,
              granted: p.granted
            }))
          }
        ],
      } as any;
    } else if (userRecord.role === 'ADMINISTRATOR') {
      const permissions = getUserRolePermissions(UserRoleEnum.ADMINISTRATOR);
      userData = {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        role: 'ADMINISTRATOR',
        accessiblePracticeIds: [], // Would need to query admin practices table
        currentPracticeId: userRecord.currentPracticeId || '',
        roles: [
          { 
            id: `legacy-ADMINISTRATOR`, 
            name: 'ADMINISTRATOR', 
            displayName: 'Administrator', 
            permissions: permissions.map(p => ({
              resource: p.resource,
              action: p.action,
              granted: p.granted
            }))
          }
        ],
      } as any;
    } else if (userRecord.role === 'SUPER_ADMIN') {
      const permissions = getUserRolePermissions(UserRoleEnum.SUPER_ADMIN);
      userData = {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        role: 'SUPER_ADMIN',
        accessiblePracticeIds: [], // Would need to query admin practices table
        currentPracticeId: userRecord.currentPracticeId || '',
        roles: [
          { 
            id: `legacy-SUPER_ADMIN`, 
            name: 'SUPER_ADMIN', 
            displayName: 'Super Admin', 
            permissions: permissions.map(p => ({
              resource: p.resource,
              action: p.action,
              granted: p.granted
            }))
          }
        ],
      } as any;
    } else {
      return null; // Unknown role
    }

    // Use the same logic as UserContext
    const practiceId = await getUserPracticeId(userData, db);

    if (!practiceId) {
      return null;
    }

    return {
      userId: userRecord.id,
      practiceId: practiceId,
      userRole: userRecord.role,
      email: userRecord.email,
      user: userData,
    };
  } catch (error) {
    console.error('Error getting user practice:', error);
    return null;
  }
}

export async function getCurrentUser(request: NextRequest) {
  try {
    const sessionTokenValue = (await cookies()).get(HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME)?.value;

    if (!sessionTokenValue) {
      return null;
    }

    // Use tenant-specific database with retry logic
    let db;
    let session;
    let userRecord;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (process.env.DEBUG_AUTH === 'true') {
          console.log(`[AUTH_UTILS getCurrentUser] DB connection attempt ${attempt}`);
        }
        db = await getCurrentTenantDb();

        // Get session with timeout wrapper
        const sessionQuery = db.query.sessions.findFirst({
          where: eq(sessionsTable.id, sessionTokenValue)
        });
        
        session = await Promise.race([
          sessionQuery,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Session query timeout')), 12000)
          )
        ]) as any;

        if (!session) {
          return null;
        }

        // Check if session is expired
        const sessionExpiresAt = typeof session.expiresAt === 'number' 
                                 ? session.expiresAt 
                                 : new Date(session.expiresAt).getTime();
        const currentTime = Date.now();

        if (sessionExpiresAt < currentTime) {
          return null;
        }

        // Get user record with timeout wrapper
        const userQuery = db.query.users.findFirst({
          where: eq(usersTable.id, session.userId),
        });
        
        userRecord = await Promise.race([
          userQuery,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('User query timeout')), 12000)
          )
        ]) as any;

        break; // Success, exit retry loop
      } catch (error: any) {
        console.error(`[AUTH_UTILS getCurrentUser] DB connection attempt ${attempt} failed:`, error.message);
        
        // Clear tenant cache on connection errors to force fresh connection
        if (error.message.includes('timeout') || error.message.includes('terminated')) {
          const { clearTenantCache } = await import('@/lib/tenant-db-resolver');
          clearTenantCache();
        }
        
        if (attempt === 3) {
          throw error; // Final attempt failed, rethrow
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
      }
    }

    if (!userRecord) {
      return null;
    }

    // Map DB user record to the application User shape and include a legacy
    // `roles` array so server-side RBAC helpers (isAdmin, hasRole, etc.) work
    // without requiring per-call mapping elsewhere.
    const mapRoleToPermissions = (roleStr: string) => {
      switch (roleStr) {
        case 'CLIENT':
          return getUserRolePermissions(UserRoleEnum.CLIENT);
        case 'PRACTICE_ADMINISTRATOR':
          return getUserRolePermissions(UserRoleEnum.PRACTICE_ADMINISTRATOR);
        case 'VETERINARIAN':
          return getUserRolePermissions(UserRoleEnum.VETERINARIAN);
        case 'PRACTICE_MANAGER':
          return getUserRolePermissions(UserRoleEnum.PRACTICE_MANAGER);
        case 'ADMINISTRATOR':
          return getUserRolePermissions(UserRoleEnum.ADMINISTRATOR);
        case 'SUPER_ADMIN':
          return getUserRolePermissions(UserRoleEnum.SUPER_ADMIN);
        default:
          return [];
      }
    };

    const permissions = mapRoleToPermissions(userRecord.role as string);

    const userData: any = {
      id: userRecord.id,
      email: userRecord.email,
      name: userRecord.name,
      role: userRecord.role,
      // Preserve practice ids if present on the DB record
      practiceId: (userRecord as any).practiceId || (userRecord as any).currentPracticeId || undefined,
      currentPracticeId: (userRecord as any).currentPracticeId || undefined,
      accessiblePracticeIds: (userRecord as any).accessiblePracticeIds || undefined,
      // Provide a legacy single-role mapping for compatibility with RBAC helpers
      roles: [
        {
          id: `legacy-${userRecord.role}`,
          name: userRecord.role,
          displayName: userRecord.role,
          permissions: permissions.map(p => ({ resource: p.resource, action: p.action, granted: p.granted }))
        }
      ]
    };

    if (process.env.DEBUG_AUTH === 'true') {
      console.log('[AUTH_UTILS getCurrentUser] Successfully created user data, returning user');
    }

    return userData;
  } catch (error) {
    console.error('[AUTH_UTILS getCurrentUser] Error getting current user:', error);
    return null;
  }
}
