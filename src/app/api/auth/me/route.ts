
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCurrentTenantDb, isCurrentRequestTenant } from '@/lib/tenant-db-resolver';
import { users as usersTable, sessions as sessionsTable, administratorAccessiblePractices as adminPracticesTable, practices as practicesTable } from '@/db/schema';
import { eq, gt, sql, like } from 'drizzle-orm'; // Import gt for greater than comparison and sql for raw queries
import { HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME } from '@/config/authConstants';
import type { User, AdministratorUser, SuperAdminUser, VeterinarianUser, PracticeManagerUser } from '@/context/UserContext'; 
import { retryWithBackoff, analyzeError } from '@/lib/network-utils'; 
import { getUserAssignedRoles } from '@/lib/rbac/dynamic-roles';

/**
 * Get the appropriate database instance based on current request context
 */
async function getContextualDb() {
  // Always resolve a tenant DB. If request isn't tagged as tenant yet, attempt resolution anyway.
  try {
    const isTenant = await isCurrentRequestTenant();
    if (isTenant) {
      console.log('[AUTH_ME_API] Using tenant-specific database');
    } else {
      console.log('[AUTH_ME_API] Forcing tenant DB resolution even though request not flagged tenant');
    }
    return await getCurrentTenantDb();
  } catch (e) {
    console.error('[AUTH_ME_API] Failed to resolve tenant DB', e);
    throw e;
  }
}

export async function GET(request: Request) {
  console.log('[API ME START] Received request to /api/auth/me');
  // Check for httpOnly session token in cookies
  const cookieStore = await cookies();
  const sessionTokenValue = cookieStore.get(HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME)?.value;

  if (!sessionTokenValue) {
    if (process.env.DEBUG_AUTH === 'true') {
      console.log('[API ME] No httpOnly session token found. Returning null.');
    }
    return NextResponse.json(null);
  }
  
  if (process.env.DEBUG_AUTH === 'true') {
    console.log('[API ME] Found httpOnly session token (value logged as ****** for security)');
  }

  try {
    // Get the appropriate database for the current tenant
    const contextualDb = await getContextualDb();
    
    // The session token is the session ID (string) stored in cookies and in DB (sessions.id is text)
    const sessionId = sessionTokenValue;
    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
      console.log(`[API ME] Invalid session token format: ${sessionTokenValue}. Clearing cookie.`);
      const response = NextResponse.json(null, { status: 200 });
      const cookieStore = await cookies();
      cookieStore.set(HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME, '', { httpOnly: true, maxAge: 0, path: '/' });
      return response;
    }

    // Wrap database operations with retry logic
    const userData = await retryWithBackoff(async () => {
      const session = await contextualDb.query.sessions.findFirst({
        where: eq(sessionsTable.id, sessionId)
      });

      if (!session) {
        if (process.env.DEBUG_AUTH === 'true') {
          console.log(`[API ME] Session ID from cookie not found in DB: ${sessionTokenValue}. Clearing cookie.`);
        }
        const response = NextResponse.json(null, { status: 200 });
        response.cookies.set(HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME, '', { httpOnly: true, maxAge: 0, path: '/' });
        return response;
      }
      
      if (process.env.DEBUG_AUTH === 'true') {
        console.log('[API ME] Session found in DB for token:', session.id);
      }

      const sessionExpiresAt = typeof session.expiresAt === 'number' 
                               ? session.expiresAt
                               : new Date(session.expiresAt).getTime(); // PG stores as Date, convert to ms
      const currentTime = Date.now();

      if (sessionExpiresAt < currentTime) {
        console.log(`[API ME] Session expired. ExpiresAt_ms: ${sessionExpiresAt}, CurrentTime_ms: ${currentTime}. Deleting session and clearing cookie.`);
  await contextualDb.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
        const response = NextResponse.json(null, { status: 200 });
        response.cookies.set(HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME, '', { httpOnly: true, maxAge: 0, path: '/' });
        return response;
      }
      console.log('[API ME] Session is valid and not expired.');

      const userRecord = await contextualDb.query.users.findFirst({
        where: eq(usersTable.id, session.userId),
      });

      if (!userRecord) {
        console.error(`[API ME] User not found for session ID: ${sessionTokenValue}, userId: ${session.userId}. Deleting orphaned session and clearing cookie.`);
  await contextualDb.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
        const response = NextResponse.json(null, { status: 200 });
        response.cookies.set(HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME, '', { httpOnly: true, maxAge: 0, path: '/' });
        return response;
      }
      console.log('[API ME] User record found for session:', userRecord.email);

      let userData: any;

      // Fetch any assigned roles (from user_roles) so the client can see assigned role entries
      let assignedRoles: any[] = [];
      try {
        assignedRoles = await getUserAssignedRoles(userRecord.id.toString());
      } catch (err) {
        console.warn('[API ME] Failed to load assigned roles for user', userRecord.id, err);
        assignedRoles = [];
      }

      if (userRecord.role === 'ADMINISTRATOR') {
        const adminPractices = await contextualDb.query.administratorAccessiblePractices.findMany({
          where: eq(adminPracticesTable.administratorId, userRecord.id),
          columns: {
            practiceId: true
          }
        });
        
        const accessiblePracticeIds = adminPractices.map((p: { practiceId: any; }) => p.practiceId.toString());
        let currentPracticeId = userRecord.currentPracticeId?.toString();

        if (accessiblePracticeIds.length === 0) {
           console.error(`[API ME] Administrator ${userRecord.email} has no accessible practices in administrator_accessible_practices table. This is a data setup issue.`);
           // Instead of returning 500 and clearing cookie, return a user object with empty practices
           // This allows the frontend to handle the case appropriately without forcing logout
           userData = {
             id: userRecord.id.toString(),
             email: Array.isArray(userRecord.email) ? userRecord.email[0] : userRecord.email,
             name: Array.isArray(userRecord.name) ? userRecord.name[0] : userRecord.name || undefined,
             role: 'ADMINISTRATOR',
             accessiblePracticeIds: [],
             currentPracticeId: '', // Empty string instead of undefined
             error: 'No accessible practices configured'
           } as any; // Type assertion to handle the error property
           return userData;
        } else if (!currentPracticeId || !accessiblePracticeIds.includes(currentPracticeId)) {
          // If currentPracticeId is null/undefined OR not in the accessible list, default to the first accessible one.
          console.warn(`[API ME] Administrator ${userRecord.email}'s currentPracticeId (${currentPracticeId}) is invalid or not set. Defaulting to first accessible: ${accessiblePracticeIds[0]}.`);
          currentPracticeId = accessiblePracticeIds[0];
        }

        userData = {
          id: userRecord.id.toString(),
          email: Array.isArray(userRecord.email) ? userRecord.email[0] : userRecord.email,
          name: Array.isArray(userRecord.name) ? userRecord.name[0] : userRecord.name || undefined,
          role: 'ADMINISTRATOR',
          accessiblePracticeIds,
          currentPracticeId: currentPracticeId!, // Should be guaranteed to be set now
          roles: assignedRoles,
        };
      } else if (userRecord.role === 'SUPER_ADMIN') {
        // SUPER_ADMIN has access to ALL practices in the system
        const allPractices = await contextualDb.query.practices.findMany({
          columns: {
            id: true
          }
        });
        
        const accessiblePracticeIds = allPractices.map((p: { id: any; }) => p.id.toString());
        let currentPracticeId = userRecord.currentPracticeId?.toString();

        if (accessiblePracticeIds.length === 0) {
           console.error(`[API ME] No practices exist in the database. Super Admin ${userRecord.email} cannot function without practices.`);
           throw new Error('No practices configured in system');
        } else if (!currentPracticeId || !accessiblePracticeIds.includes(currentPracticeId)) {
          // If currentPracticeId is null/undefined OR not in the accessible list, default to the first practice
          console.warn(`[API ME] Super Admin ${userRecord.email}'s currentPracticeId (${currentPracticeId}) is invalid or not set. Defaulting to first available practice: ${accessiblePracticeIds[0]}.`);
          currentPracticeId = accessiblePracticeIds[0];
        }

        userData = {
          id: userRecord.id.toString(),
          email: Array.isArray(userRecord.email) ? userRecord.email[0] : userRecord.email,
          name: Array.isArray(userRecord.name) ? userRecord.name[0] : userRecord.name || undefined,
          role: 'SUPER_ADMIN',
          accessiblePracticeIds,
          currentPracticeId: currentPracticeId!, // Should be guaranteed to be set now
          roles: assignedRoles,
        };
      } else if (userRecord.role === 'PRACTICE_ADMINISTRATOR') {
        if (!userRecord.practiceId) {
           console.warn(`[API ME] Practice Administrator ${userRecord.email} is not associated with a practice. Returning null.`);
           throw new Error('Practice Administrator not associated with a practice');
        }
        userData = {
          id: userRecord.id.toString(),
          email: Array.isArray(userRecord.email) ? userRecord.email[0] : userRecord.email,
          name: Array.isArray(userRecord.name) ? userRecord.name[0] : userRecord.name || undefined,
          role: 'PRACTICE_ADMINISTRATOR',
          practiceId: userRecord.practiceId!.toString(),
          roles: assignedRoles,
        };
      } else if (userRecord.role === 'CLIENT') {
        if (!userRecord.practiceId) {
          console.warn(`[API ME] Client ${userRecord.email} is not associated with a practice. Returning null.`);
          throw new Error('Client not associated with a practice');
        }
        userData = {
          id: userRecord.id.toString(),
          email: Array.isArray(userRecord.email) ? userRecord.email[0] : userRecord.email,
          name: Array.isArray(userRecord.name) ? userRecord.name[0] : userRecord.name|| undefined,
          role: 'CLIENT',
          practiceId: userRecord.practiceId!.toString(),
          roles: assignedRoles,
        };
      } else if (userRecord.role === 'VETERINARIAN') {
        if (!userRecord.practiceId) {
          console.warn(`[API ME] Veterinarian ${userRecord.email} is not associated with a practice. Returning null.`);
          throw new Error('Veterinarian not associated with a practice');
        }
        userData = {
          id: userRecord.id.toString(),
          email: Array.isArray(userRecord.email) ? userRecord.email[0] : userRecord.email,
          name: Array.isArray(userRecord.name) ? userRecord.name[0] : userRecord.name || undefined,
          role: 'VETERINARIAN',
          practiceId: userRecord.practiceId!.toString(),
          roles: assignedRoles,
        };
      } else if (userRecord.role === 'PRACTICE_MANAGER') {
        if (!userRecord.practiceId) {
          console.warn(`[API ME] Practice Manager ${userRecord.email} is not associated with a practice. Returning null.`);
          throw new Error('Practice Manager not associated with a practice');
        }
        userData = {
          id: userRecord.id.toString(),
          email: Array.isArray(userRecord.email) ? userRecord.email[0] : userRecord.email,
          name: Array.isArray(userRecord.name) ? userRecord.name[0] : userRecord.name || undefined,
          role: 'PRACTICE_MANAGER',
          practiceId: userRecord.practiceId!.toString(),
          roles: assignedRoles,
        };
      } else {
        console.error(`[API ME] Unknown user role for ${userRecord.email}: ${userRecord.role}. Clearing cookie and returning null.`);
        throw new Error(`Unknown user role: ${userRecord.role}`);
      }
      
      return userData;
    }, 2, 1000); // 2 retries with 1 second base delay

    // Handle special cases where retry returns a response directly
    if (userData && typeof userData === 'object' && 'status' in userData) {
      return userData; // This is a NextResponse object
    }
    
    const isAdminType = userData.role === 'ADMINISTRATOR' || userData.role === 'SUPER_ADMIN';
    const currentPracticeForLogging = isAdminType ? (userData as AdministratorUser | SuperAdminUser).currentPracticeId : 'N/A';
    console.log('[API ME SUCCESS] Successfully fetched user data:', userData.email, userData.role, 'Current Practice ID (if admin):', currentPracticeForLogging);
    return NextResponse.json(userData);

  } catch (error) {
    const networkError = analyzeError(error);
    console.error('[API ME CATCH_ERROR] Error fetching current user:', {
      isNetworkError: networkError.isNetworkError,
      isDatabaseError: networkError.isDatabaseError,
      userMessage: networkError.userMessage,
      technicalMessage: networkError.technicalMessage,
      originalError: error
    });

    // For network/database errors, return a more informative error message
    if (networkError.isNetworkError || networkError.isDatabaseError) {
      const response = NextResponse.json({ 
        error: networkError.userMessage,
        isNetworkError: networkError.isNetworkError 
      }, { status: 503 }); // Service Unavailable
      return response;
    }

    // For other errors, clear the cookie and return null
    const response = NextResponse.json({ error: 'Failed to fetch user session' }, { status: 500 });
    response.cookies.set(HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME, '', { httpOnly: true, maxAge: 0, path: '/' });
    return response;
  }
}
